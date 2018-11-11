#!/bin/bash

INSTALL_DIR=/opt/NodeJSAzureDynamicDNS

#Step 1) Check if root--------------------------------------
if [[ $EUID -ne 0 ]]; then
   echo "Please execute the installation script as root." 
   exit 1
fi
#-----------------------------------------------------------
install (){
  if [-d "$INSTALL_DIR"]; then
    echo "NodeJSAzureDynamicDNS already installed!"
  else
    echo "Installing NodeJSAzureDynamicDNS"
    apt-get update && sudo apt-get install unzip -y
    wget -Nnv https://github.com/Welasco/NodeJSAzureDynamicDNS/archive/master.zip -O NodeJSAzureDynamicDNS.zip
    unzip NodeJSAzureDynamicDNS.zip  -d /opt
    mv /opt/NodeJSAzureDynamicDNS-master/ $INSTALL_DIR
    chmod +755 $INSTALL_DIR/UpdateAzureRMDDNS.js
    cd $INSTALL_DIR
    npm install
    cp $INSTALL_DIR/UpdateAzureRMDDNS.service /lib/systemd/system
    systemctl daemon-reload
    systemctl enable UpdateAzureRMDDNS

    echo "NodeJSAzureDynamicDNS Installed at $INSTALL_DIR."
    echo "You must setup the $INSTALL_DIR/config.json using your settings!"
    echo "Start the service after: sudo systemctl start UpdateAzureRMDDNS"
  fi
}

# Checking if Node.JS is installed
# Install Node.JS
# https://github.com/mklement0/n-install
# curl -L https://git.io/n-install | bash
# https://github.com/tj/n
# https://stackoverflow.com/questions/42741243/how-do-you-install-newest-version-of-node-js-on-raspberry-pi
if ! [ -x "$(command -v node)" ]; then
  echo "NodeJS Not found"
  echo "Installing NodeJS"
  curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -
  sudo apt-get install -y nodejs  
  install
else
  echo "NodeJS already installed"
  install
fi

