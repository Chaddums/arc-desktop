/**
 * windowFinder — Find a window's position/size by process name using PowerShell.
 * No native deps, fully EAC-safe.
 */

const { execFile } = require("child_process");

// PowerShell script that finds a window rect by process name
const PS_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
$proc = Get-Process -Name "$PROCNAME$" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
    $rect = New-Object WinAPI+RECT
    [WinAPI]::GetWindowRect($proc.MainWindowHandle, [ref]$rect) | Out-Null
    "$($rect.Left),$($rect.Top),$($rect.Right),$($rect.Bottom)"
} else {
    "NOTFOUND"
}
`;

/**
 * Get the bounding rect of a window by process name.
 * Returns { x, y, width, height } or null if not found.
 */
function getWindowBounds(processName) {
  return new Promise((resolve) => {
    const script = PS_SCRIPT.replace("$PROCNAME$", processName.replace(".exe", ""));
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { windowsHide: true, timeout: 3000 },
      (err, stdout) => {
        if (err) return resolve(null);
        const trimmed = (stdout || "").trim();
        if (!trimmed || trimmed === "NOTFOUND") return resolve(null);
        const parts = trimmed.split(",").map(Number);
        if (parts.length !== 4 || parts.some(isNaN)) return resolve(null);
        const [left, top, right, bottom] = parts;
        resolve({
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
        });
      }
    );
  });
}

module.exports = { getWindowBounds };
