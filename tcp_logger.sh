#!/bin/bash

# Check if tcpflow is installed
if ! command -v tcpflow &> /dev/null; then
    echo "[!] tcpflow is not installed. Would you like to install it? (y/n)"
    read choice
    if [[ $choice == [Yy] ]]; then
        sudo apt-get install tcpflow -y # Use the appropriate package manager for your system
    else
        echo "[!] Aborting!."
        exit 1
    fi
fi

if [ $# -ne 1 ]; then
    echo "[?] Usage: $0 <port>"
    exit 1
fi

port="$1"
echo "[?] tcpflow: listening on port $port"
output_dir="tcpflow_logs"  # Replace with the desired output directory
timestamp="$(date +'%Y%m%d%H%M-%s')"
output_raw="$(pwd)/${output_dir}/${port}_tcpflow-${timestamp}_log.txt"

# Create the output directory if it doesn't exist
if [ ! -d "$output_dir" ]; then
    mkdir -p "$output_dir"
    echo "[?] Created output directory: $output_dir"
fi

sudo tcpflow -i any -C -J "port $port" | \
jq -r '. as $data | 
"================================================================\n=============[ " + $data.src_host + ":" + ($data.src_port | tostring) + " > " + $data.dst_host + ":" + ($data.dst_port | tostring) + " ] =============\n[?] Request time: " + 
(now + (7 * 3600) | strftime("%d/%m/%Y %H:%M:%S")) + 
"[+] Request Body (Raw Data):\n" + 
($data.payload | map(.*1) | implode), "\n=============[ " + $data.dst_host + ":" + ($data.dst_port | tostring) + " > " + $data.src_host + ":" + ($data.src_port | tostring) + " ] =============\n[+] Request Body (Decimal Data):\n\($data.payload)\n================================================================\n"' | tee -a "$output_raw"
echo "[+] Results have been saved to: $output_raw"
