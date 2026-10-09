"""
SSPACIA USB DSC Remote Signing Gateway (Host Bridge)
-----------------------------------------------------
Connects the physical USB Token (ProxKey / Watchdata / PantaSign)
to the SSPACIA web server (sspacia.com).

Allows Community Managers at Agarwal Complex, Premier House, or Mercado
to click "Apply Digital Signature" on the website and have this host computer
sign the invoice PDF automatically using the hardware USB token.
"""

import argparse
import base64
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import pkcs11 as p11
import tzlocal
from asn1crypto import x509
from pkcs11 import Attribute, ObjectClass
from pyhanko.pdf_utils.font import SimpleFontEngineFactory
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.text import TextBox, TextBoxStyle
from pyhanko.sign import fields, pkcs11 as ph_pkcs11, signers
from pyhanko.stamp import TextStamp, TextStampStyle

# ----------------------------- CONFIGURATION --------------------------------
DEFAULT_SERVER_URL = "https://sspacia.com"
DEFAULT_CENTER_NAME = "Mercado"
DEFAULT_TOKEN_PIN = "PASSWORD"
BRIDGE_SECRET = "sspacia_dsc_secure_2026"

# Candidate paths for ProxKey / Watchdata / ePass / mToken DLLs
PKCS11_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), "SignatureP11.dll"),
    os.path.join(os.path.dirname(__file__), "..", "scratch", "SignatureP11.dll"),
    r"C:\Windows\System32\SignatureP11.dll",
    r"C:\Windows\System32\wdpkcs.dll",
    r"C:\Windows\System32\eps2003csp11.dll",
    r"C:\Windows\System32\eps2003csp11_v2.dll",
    r"C:\Windows\System32\mtoken_pkcs11.dll",
    r"C:\Windows\System32\eTPKCS11.dll",
    r"C:\Windows\System32\acospkcs11.dll",
    r"C:\Windows\SysWOW64\SignatureP11.dll",
    r"C:\Windows\SysWOW64\wdpkcs.dll",
    r"C:\Windows\SysWOW64\eps2003csp11.dll",
    r"C:\Windows\SysWOW64\mtoken_pkcs11.dll",
    r"C:\Windows\SysWOW64\eTPKCS11.dll",
    r"C:\Program Files\Hypersecu\HyperPKI\pkcs11.dll",
    r"C:\Program Files (x86)\Hypersecu\HyperPKI\pkcs11.dll",
]

LOG_FILE = Path(__file__).resolve().parent / "gateway.log"


def log_msg(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{ts}] {msg}"
    print(formatted)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass


def load_token_pin(cli_pin=None):
    if cli_pin and cli_pin != DEFAULT_TOKEN_PIN:
        return cli_pin
    pin_file = Path(__file__).resolve().parent / "dsc_pin.txt"
    if pin_file.exists():
        try:
            content = pin_file.read_text(encoding="utf-8").strip()
            for line in content.splitlines():
                clean = line.strip()
                if clean and not clean.startswith("#"):
                    return clean
        except Exception:
            pass
    return cli_pin or DEFAULT_TOKEN_PIN

# Signature box in PDF points: (left, bottom, right, top). Page = 612 x 792.
# Free area inside the "for SSPACIA INDIA PVT LTD" cell above "Authorised Signatory".
SIG_BOX = (272, 33, 394, 67)
SIG_PAGE = 0

NAME_SIZE = 10   # Signer name size on left
INFO_SIZE = 5    # Details size on right
POLL_INTERVAL = 2.5 # Polling interval in seconds
# ----------------------------------------------------------------------------


def wrap(text, width):
    """Greedy word wrap by character count."""
    lines, cur = [], ""
    for w in text.split():
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        lines.append(cur)
    return lines


@dataclass(frozen=True)
class SplitStampStyle(TextStampStyle):
    """Stamp with a big name on the left and small details on the right."""
    name_size: int = NAME_SIZE
    info_size: int = INFO_SIZE

    def create_stamp(self, writer, box, text_params):
        return SplitStamp(
            writer=writer, style=self, box=box, text_params=text_params
        )


class SplitStamp(TextStamp):
    def _render_inner_content(self):
        st = self.style
        name = (self.text_params or {}).get("signer_name", "").upper()
        now = datetime.now(tz=tzlocal.get_localzone())
        name_lines = wrap(name, 11)
        info_lines = (
            ["Digitally signed by"]
            + name_lines
            + ["Date: " + now.strftime("%Y.%m.%d"), now.strftime("%H:%M:%S %z")]
        )
        W, H = self.box.width, self.box.height

        def text_block(lines, font, size, font_name):
            tb = TextBox(
                TextBoxStyle(font=font, font_size=size),
                writer=self.writer,
                resources=self.resources,
                box=None,
                font_name=font_name,
            )
            tb.content = "\n".join(lines)
            cmds = tb.render()
            return cmds, tb.box.height

        bold = SimpleFontEngineFactory("Helvetica-Bold", 0.68)
        regular = SimpleFontEngineFactory("Helvetica", 0.5)
        n_cmds, n_h = text_block(name_lines, bold, st.name_size, "F1")
        i_cmds, i_h = text_block(info_lines, regular, st.info_size, "F2")

        MARGIN = 10
        name_x = 5 - MARGIN
        info_x = 71 - MARGIN
        out = [b"q"]
        out.append(b"1 0 0 1 %f %f cm" % (name_x, (H - n_h) / 2))
        out.append(n_cmds)
        out.append(b"Q q")
        out.append(b"1 0 0 1 %f %f cm" % (info_x, (H - i_h) / 2))
        out.append(i_cmds)
        out.append(b"Q")
        return out


def find_dll(cli_path=None):
    if cli_path and os.path.exists(cli_path):
        return os.path.abspath(cli_path)
    for p in PKCS11_CANDIDATES:
        if os.path.exists(p):
            return os.path.abspath(p)
    return None


def get_token_session(lib_path, pin):
    """Attempts to find a token and open a session with the given PIN."""
    try:
        lib = p11.lib(lib_path)
        slots = lib.get_slots(token_present=True)
        if not slots:
            return None, "NO_TOKEN"
        slot = slots[0]
        session = slot.get_token().open(user_pin=pin)
        return session, None
    except Exception as e:
        return None, str(e)


def pick_signing_cert(session):
    """
    Finds the user's signing certificate automatically (Certificate [0] or non-CA).
    Never prompts the user so it runs 100% headless.
    """
    certs = list(session.get_objects({Attribute.CLASS: ObjectClass.CERTIFICATE}))
    if not certs:
        return None, None, None

    # Preferred: find cert that is not a Sub CA / CA
    chosen = None
    chosen_cn = ""
    for c in certs:
        try:
            cn = x509.Certificate.load(c[Attribute.VALUE]).subject.native.get("common_name", "")
        except Exception:
            cn = ""
        # If it's a Sub CA, skip it if we have another option
        if "Sub CA" not in cn and "CA" not in cn and not chosen:
            chosen = c
            chosen_cn = cn

    if not chosen:
        chosen = certs[0]
        try:
            chosen_cn = x509.Certificate.load(chosen[Attribute.VALUE]).subject.native.get("common_name", "")
        except Exception:
            chosen_cn = "PRAVEEN DILIPKUMAR AGARWAL"

    return chosen[Attribute.LABEL], chosen[Attribute.ID], chosen_cn


def sign_pdf_buffer(pdf_bytes: bytes, cert_label, cert_id, signer_name, session) -> bytes:
    """Signs PDF bytes using pyHanko and the open PKCS#11 session."""
    signer = ph_pkcs11.PKCS11Signer(session, cert_label=cert_label, key_id=cert_id)
    style = SplitStampStyle(border_width=1, stamp_text="-")

    in_stream = io.BytesIO(pdf_bytes)
    out_stream = io.BytesIO()

    writer = IncrementalPdfFileWriter(in_stream, strict=False)
    meta = signers.PdfSignatureMetadata(
        field_name="SSPACIA_Sign", md_algorithm="sha256"
    )
    pdf_signer = signers.PdfSigner(
        meta,
        signer=signer,
        stamp_style=style,
        new_field_spec=fields.SigFieldSpec(
            sig_field_name="SSPACIA_Sign",
            on_page=SIG_PAGE,
            box=SIG_BOX,
        ),
    )
    pdf_signer.sign_pdf(
        writer,
        output=out_stream,
        appearance_text_params={"signer_name": signer_name},
    )
    return out_stream.getvalue()


def call_server(server_url: str, endpoint: str, payload: dict) -> dict:
    """Sends JSON POST request to SSPACIA server using Python standard library."""
    url = f"{server_url.rstrip('/')}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "SSPACIA-DSC-Gateway/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description="SSPACIA USB DSC Remote Signing Gateway")
    parser.add_argument("--server", default=DEFAULT_SERVER_URL, help="SSPACIA server URL (e.g. https://sspacia.com)")
    parser.add_argument("--center", default=DEFAULT_CENTER_NAME, help="Host location name (e.g. Mercado)")
    parser.add_argument("--pin", default=DEFAULT_TOKEN_PIN, help="USB Token PIN (default: PASSWORD)")
    parser.add_argument("--lib", default=None, help="Custom path to SignatureP11.dll")
    args = parser.parse_args()

    server_url = args.server.rstrip("/")
    center_name = args.center
    pin = load_token_pin(args.pin)

    log_msg("=" * 68)
    log_msg("      SSPACIA USB DSC REMOTE SIGNING GATEWAY - HOST BRIDGE")
    log_msg("=" * 68)
    log_msg(f"[*] Target Server : {server_url}")
    log_msg(f"[*] Host Centre   : {center_name}")

    dll_path = find_dll(args.lib)
    if not dll_path:
        log_msg("[!] ERROR: Could not find PKCS#11 driver DLL (SignatureP11.dll)!")
        log_msg("    Please place SignatureP11.dll next to this script or install your USB token driver.")
        input("Press Enter to exit...")
        sys.exit(1)

    log_msg(f"[*] PKCS#11 DLL   : {dll_path}")
    log_msg(f"[*] Polling Loop  : Every {POLL_INTERVAL} seconds")
    log_msg("=" * 68)
    log_msg("[*] Starting gateway service... (Press Ctrl+C to stop)\n")

    last_status = None

    while True:
        try:
            # 1. Check if token is physically inserted and accessible
            session, err = get_token_session(dll_path, pin)

            if not session:
                if err and ("PIN" in str(err).upper() or "PASSWORD" in str(err).upper()):
                    if last_status != "PIN_ERROR":
                        log_msg(f"[!] USB Token detected, but PIN was REJECTED ({err})! Please check dsc_pin.txt.")
                        last_status = "PIN_ERROR"
                elif last_status != "TOKEN_UNPLUGGED":
                    log_msg("[!] USB Token NOT detected. Please insert the USB DSC token into this PC...")
                    last_status = "TOKEN_UNPLUGGED"

                # Report UNPLUGGED heartbeat
                try:
                    call_server(server_url, "/api/admin/Invoices/dsc-bridge", {
                        "action": "HEARTBEAT",
                        "center": center_name,
                        "status": "TOKEN_UNPLUGGED",
                        "tokenLabel": "None",
                        "secret": BRIDGE_SECRET,
                    })
                except Exception:
                    pass

                time.sleep(POLL_INTERVAL)
                continue

            # 2. Token is present - inspect certificate
            try:
                cert_label, cert_id, cert_name = pick_signing_cert(session)
                signer_name = cert_name or "PRAVEEN DILIPKUMAR AGARWAL"

                if last_status != "READY":
                    log_msg(f"[OK] USB Token detected & unlocked!")
                    log_msg(f"    --> Signer Certificate: {signer_name}")
                    log_msg(f"    --> Gateway status: ONLINE & READY FOR SIGNING REQUESTS")
                    last_status = "READY"

                # 3. Send Heartbeat to SSPACIA server
                call_server(server_url, "/api/admin/Invoices/dsc-bridge", {
                    "action": "HEARTBEAT",
                    "center": center_name,
                    "status": "ONLINE",
                    "tokenLabel": signer_name,
                    "secret": BRIDGE_SECRET,
                })

                # 4. Check for any pending signing job from CMs
                poll_res = call_server(server_url, "/api/admin/Invoices/dsc-bridge", {
                    "action": "POLL",
                    "center": center_name,
                    "secret": BRIDGE_SECRET,
                })

                job = poll_res.get("job")
                if job:
                    job_id = job.get("jobId")
                    company = job.get("companyName", "Invoice")
                    log_msg(f"\n[JOB RECEIVED] Signing request for: {company} (Job ID: {job_id})")

                    raw_b64 = job.get("pdfBase64", "")
                    if not raw_b64:
                        log_msg("    [!] Error: No PDF base64 provided in job payload.")
                    else:
                        log_msg(f"    --> Decoding PDF ({len(raw_b64)} chars base64)...")
                        pdf_bytes = base64.b64decode(raw_b64)

                        log_msg("    --> Applying cryptographic signature inside 'for SSPACIA INDIA PVT LTD' box...")
                        signed_bytes = sign_pdf_buffer(pdf_bytes, cert_label, cert_id, signer_name, session)

                        signed_b64 = base64.b64encode(signed_bytes).decode("utf-8")
                        log_msg(f"    --> Signature complete ({len(signed_bytes)} bytes)! Uploading to {server_url}...")

                        comp_res = call_server(server_url, "/api/admin/Invoices/dsc-bridge", {
                            "action": "COMPLETE",
                            "jobId": job_id,
                            "signedPdfBase64": signed_b64,
                            "signerName": signer_name,
                            "secret": BRIDGE_SECRET,
                        })

                        if comp_res.get("success"):
                            log_msg(f"    [SUCCESS] Job {job_id} completed and stored on server! URL: {comp_res.get('signedPdfUrl')}\n")
                        else:
                            log_msg(f"    [!] Error completing job: {comp_res.get('error')}\n")

            finally:
                try:
                    session.close()
                except Exception:
                    pass

        except urllib.error.URLError as uerr:
            # Network issue or server restarting
            # Don't crash, just notify and retry
            pass
        except KeyboardInterrupt:
            print("\n[*] Stopping SSPACIA DSC Gateway. Goodbye!")
            sys.exit(0)
        except Exception as ex:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Notice: {ex}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
