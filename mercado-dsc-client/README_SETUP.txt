========================================================================
   SSPACIA USB DSC REMOTE SIGNING GATEWAY - ACCOUNTANT LAPTOP SETUP
========================================================================

NO TECHNICAL KNOWLEDGE NEEDED!
Python does NOT need to be installed beforehand.
The setup script will automatically download and configure everything for you.

------------------------------------------------------------------------
STEP-BY-STEP SETUP (Takes 1 minute):
------------------------------------------------------------------------

1. Copy this entire "mercado-dsc-client" folder anywhere on the laptop 
   (e.g., C:\SSPACIA-DSC or to your Desktop).

2. Double-click "setup-autostart-on-boot.bat" ONCE.
   - It will check for Python. If not found, it automatically downloads 
     and installs official Python silently (no admin password needed!).
   - It automatically installs all required signing libraries (pyhanko, etc.).
   - It sets up Windows to start the gateway in the background every 
     time your laptop turns on.
   - It launches the gateway in the background immediately.

3. (Optional) If your USB Token PIN is different from "PASSWORD" (e.g., 12345678):
   - Open "dsc_pin.txt" in Notepad.
   - Replace PASSWORD with your PIN and save.

4. YOU ARE ALL DONE!
   - Just plug your USB DSC Token (ProxKey / Watchdata / ePass / mToken)
     into any USB port on your laptop.
   - Invoices from https://sspacia.com will be signed automatically in 
     the background!
   - If an invoice has multiple sub-invoices (Split Invoices), ALL of them
     will be signed automatically.
   - You NEVER need to open this folder or double-click anything again.
   - It starts itself whenever you turn on your laptop.

------------------------------------------------------------------------
FILES IN THIS FOLDER:
------------------------------------------------------------------------
- setup-autostart-on-boot.bat : Double-click ONCE to install & start autostart
- test-gateway-visible.bat    : Opens a live black test window showing status
- dsc_pin.txt                 : Token PIN configuration (default: PASSWORD)
- uninstall-autostart.bat     : Removes from Windows startup if needed
- gateway.log                 : History of signing jobs and token connections
- sspacia-dsc-gateway.py      : Core background signing bridge service
- SignatureP11.dll            : ProxKey / Watchdata hardware driver
========================================================================
