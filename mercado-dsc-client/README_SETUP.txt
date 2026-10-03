========================================================================
   SSPACIA USB DSC REMOTE SIGNING GATEWAY - MERCADO CM SETUP
========================================================================

HOW TO INSTALL ON MERCADO CM PC:

1. Copy this entire "mercado-dsc-client" folder anywhere on the Mercado PC 
   (for example: C:\SSPACIA-DSC or D:\SSPACIA-DSC).

2. Make sure Python and pyHanko are installed (from pyhanko / Python installer).

3. Double-click "setup-autostart-on-boot.bat" ONCE.
   - It will automatically set up the gateway to start in the background 
     every time the PC boots up.
   - No terminal window will stay open (runs completely invisible in background).

4. DONE! 
   The Mercado CM NEVER needs to touch these files again.
   Whenever digital signing is required, she simply inserts the 
   Watchdata / ProxKey USB token into the PC port.
   The SSPACIA website will automatically detect it and sign instantly!

------------------------------------------------------------------------
FILES IN THIS FOLDER:
- sspacia-dsc-gateway.py    : Core signing bridge script
- SignatureP11.dll          : Watchdata ProxKey PKCS#11 driver
- setup-autostart-on-boot.bat : Sets up invisible autostart on Windows boot
- uninstall-autostart.bat   : Removes from Windows startup if needed
- test-gateway-visible.bat  : Manual launcher showing live black window for testing
========================================================================
