#!/bin/bash

echo "================================================"
echo "PRODUCTION HOTFIX FOR JYAIBOT WhatsApp Bot"
echo "================================================"
echo ""
echo "This script will fix the following issues:"
echo "1. IIT/COEP searches returning no results"
echo "2. Board member queries not working"
echo "3. Generic responses instead of actual searches"
echo ""
echo "================================================"

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "ERROR: server.js not found. Please run this from the bot directory."
    exit 1
fi

echo "Step 1: Backing up current code..."
cp -r src src_backup_$(date +%Y%m%d_%H%M%S)

echo "Step 2: Pulling latest code from GitHub..."
git fetch origin
git pull origin main

echo "Step 3: Installing dependencies..."
npm install

echo "Step 4: Checking for PM2..."
if command -v pm2 &> /dev/null; then
    echo "PM2 found. Restarting bot..."
    pm2 restart all
    pm2 save
    echo "Bot restarted with PM2"
else
    echo "PM2 not found. Checking for systemd service..."
    if systemctl list-units --full -all | grep -Fq "jyaibot"; then
        echo "Restarting systemd service..."
        sudo systemctl restart jyaibot
        echo "Bot restarted with systemd"
    else
        echo "WARNING: No process manager found. Please restart the bot manually:"
        echo "  Option 1: pm2 restart all"
        echo "  Option 2: sudo systemctl restart jyaibot"
        echo "  Option 3: Kill the node process and restart with: npm start"
    fi
fi

echo ""
echo "================================================"
echo "HOTFIX COMPLETE!"
echo "================================================"
echo ""
echo "Please test the following:"
echo "1. Send 'any yatris from IIT?' - Should return IIT alumni"
echo "2. Send 'someone from pune COEP' - Should return COEP alumni"
echo "3. Send 'who is the COO?' - Should return Chinmay Vadnere"
echo "4. Send 'board members' - Should list all board members"
echo ""
echo "If issues persist, check logs with:"
echo "  pm2 logs"
echo "  OR"
echo "  journalctl -u jyaibot -f"
echo ""