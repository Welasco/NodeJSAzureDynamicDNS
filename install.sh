#!/bin/bash

#Step 1) Check if root--------------------------------------
if [[ $EUID -ne 0 ]]; then
   echo "Please execute script as root." 
   exit 1
fi
#-----------------------------------------------------------

# Checking if Node.JS is installed
# Install Node.JS
# https://github.com/mklement0/n-install
# curl -L https://git.io/n-install | bash
if [ $(which node 2>/dev/null) ]; then
  echo "nodejs found"
else
  echo "nodejs not found"
fi
