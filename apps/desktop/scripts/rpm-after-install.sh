#!/bin/bash
# RPM after-install: the shared Linux desktop action Exec is AppImage-only
# (`AppRun --no-sandbox --new-window`). Rewrite it to the package's main Exec.
set -euo pipefail
shopt -s nullglob

for desktop in /usr/share/applications/*.desktop; do
	if ! grep -q "AppRun --no-sandbox --new-window" "$desktop"; then
		continue
	fi
	main_exec=$(grep -m1 "^Exec=" "$desktop" | sed "s/^Exec=//; s/ %[A-Za-z]*$//")
	if [ -z "$main_exec" ]; then
		continue
	fi
	sed -i "s|^Exec=AppRun --no-sandbox --new-window|Exec=${main_exec} --new-window|" "$desktop"
done
