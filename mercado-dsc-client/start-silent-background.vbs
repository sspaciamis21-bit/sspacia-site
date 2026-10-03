Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = scriptDir

' Runs the Python gateway script completely hidden in the background (0 = hide window)
runCmd = "cmd /c ""pyw sspacia-dsc-gateway.py || pythonw sspacia-dsc-gateway.py || py sspacia-dsc-gateway.py || python sspacia-dsc-gateway.py"""
WshShell.Run runCmd, 0, False
