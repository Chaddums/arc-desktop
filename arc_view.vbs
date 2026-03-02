Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = scriptDir

' Check for --reset argument
Dim doReset
doReset = False
For Each arg In WScript.Arguments
    If LCase(arg) = "--reset" Then doReset = True
Next

If doReset Then
    Dim userDataDir
    userDataDir = shell.ExpandEnvironmentStrings("%APPDATA%") & "\arc-view"
    If fso.FolderExists(userDataDir) Then
        fso.DeleteFolder userDataDir, True
    End If
End If

' Build web bundle and launch Electron (hidden console)
shell.Run "cmd /c npx expo export --platform web >nul 2>&1 && npx electron electron/main.js --dev", 0, False
