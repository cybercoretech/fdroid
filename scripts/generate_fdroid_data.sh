#!/usr/bin/env bash
set -e
TSV="apps.tsv"
JSON="public/apps.json"
# start JSON array
 echo "[" > "$JSON"
 tail -n +2 "$TSV" | while IFS=$'\t' read -r repo asset appId cert; do
   echo "  {\"repo\":\"$repo\",\"asset\":\"$asset\",\"id\":\"$appId\",\"cert\":\"$cert\"}," >> "$JSON"
 done
 # remove trailing comma on last line
 sed -i '$ s/,$//' "$JSON"
 echo "]" >> "$JSON"
