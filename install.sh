#!/bin/bash

# curl -SL https://raw.githubusercontent.com/Welasco/NodeJSAzureDynamicDNS/master/install.sh | sudo -E bash -

INSTALL_DIR=/opt/NodeJSAzureDynamicDNS

#Step 1) Check if root--------------------------------------
if [[ $EUID -ne 0 ]]; then
   echo "Please execute the installation script as root." 
   exit 1
fi
#-----------------------------------------------------------

echo "Installing NodeJSAzureDynamicDNS"

install (){
  if [-d "$INSTALL_DIR"]; then
    echo "NodeJSAzureDynamicDNS already installed!"
    exit 1
  else
    echo "Installing unzip"
    apt-get update && sudo apt-get install unzip -y > /dev/null 2>&1
    echo "Downloading NodeJSAzureDynamicDNS"
    wget -Nnv https://github.com/Welasco/NodeJSAzureDynamicDNS/archive/master.zip -O NodeJSAzureDynamicDNS.zip
    unzip NodeJSAzureDynamicDNS.zip -d /opt > /dev/null 2>&1
    mv /opt/NodeJSAzureDynamicDNS-master/ $INSTALL_DIR
    chmod +755 $INSTALL_DIR/UpdateAzureRMDDNS.js
    cd $INSTALL_DIR
    npm install > /dev/null 2>&1
    cp $INSTALL_DIR/UpdateAzureRMDDNS.service /lib/systemd/system
    systemctl daemon-reload
    systemctl enable UpdateAzureRMDDNS
    echo " "
    echo "NodeJSAzureDynamicDNS Installed at $INSTALL_DIR."
    echo "You must setup the $INSTALL_DIR/config.json using your settings!"
    echo "Start the service after: sudo systemctl start UpdateAzureRMDDNS"
  fi
}

# Checking if Node.JS is installed
# Install Node.JS
if ! [ -x "$(command -v node)" ]; then
  if $(uname -m | grep -Eq ^armv6); then
    echo "ARMV6 detected installing node-v11.1.0-linux-armv6l.tar.gz"
    curl -o node-v11.1.0-linux-armv6l.tar.gz https://nodejs.org/dist/v11.1.0/node-v11.1.0-linux-armv6l.tar.gz
    tar -xzf node-v11.1.0-linux-armv6l.tar.gz
    sudo cp -r node-v11.1.0-linux-armv6l/* /usr/local/

  else
    echo "NodeJS Not found"
    echo "Installing NodeJS"
    curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -
    sudo apt-get install -y nodejs  
  fi
  install
  
else
  echo "NodeJS already installed"
  install
fi

