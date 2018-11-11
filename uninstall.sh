#!/bin/bash
echo "Uninstalling NodeJSAzureDynamicDNS"
INSTALL_DIR=/opt/NodeJSAzureDynamicDNS

rm -rf INSTALL_DIR
rm -rf sudo rm -rf /lib/systemd/system/UpdateAzureRMDDNS.service

echo "NodeJSAzureDynamicDNS was Uninstalled"

echo "To Uninstall NodeJS please type:"
echo "sudo apt-get purge --auto-remove nodejs"