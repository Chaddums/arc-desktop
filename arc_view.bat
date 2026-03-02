@echo off
:: Thin wrapper — delegates to arc_view.vbs for silent (no console window) execution.
:: Usage: arc_view.bat [--reset]
cscript //nologo "%~dp0arc_view.vbs" %*
