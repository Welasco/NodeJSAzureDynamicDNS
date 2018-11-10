#!/bin/bash

#Step 1) Check if root--------------------------------------
if [[ $EUID -ne 0 ]]; then
   echo "Please execute the installation script as root." 
   exit 1
fi
#-----------------------------------------------------------

# Checking if Node.JS is installed
# Install Node.JS
# https://github.com/mklement0/n-install
# curl -L https://git.io/n-install | bash
# https://github.com/tj/n
# https://stackoverflow.com/questions/42741243/how-do-you-install-newest-version-of-node-js-on-raspberry-pi
if [ $(which node 2>/dev/null) ]; then
  echo "NodeJS found"
else
  wget -Nnv https://git.io/n-install && bash n-install; rm -f n-install
  # curl -L https://git.io/n-install | bash
fi

mkdir /opt
wget -Nnv https://github.com/Welasco/NodeJSAzureDynamicDNS/archive/master.zip -O NodeJSAzureDynamicDNS.zip
unzip NodeJSAzureDynamicDNS.zip  -d /opt
mv /opt/NodeJSAzureDynamicDNS-master/ /opt/NodeJSAzureDynamicDNS
chmod +755 /opt/NodeJSAzureDynamicDNS/UpdateAzureRMDDNS.js
cp /opt/NodeJSAzureDynamicDNS/UpdateAzureRMDDNS.service /lib/systemd/systemd
systemctl daemon-reload
sudo systemctl enable UpdateAzureRMDDNS

echo "NodeJSAzureDynamicDNS Installed at /opt/NodeJSAzureDynamicDNS."
echo "You must setup the /opt/NodeJSAzureDynamicDNS/config.json using your settings!"
echo "Start the service after: sudo systemctl start UpdateAzureRMDDNS"