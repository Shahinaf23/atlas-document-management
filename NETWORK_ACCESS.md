# Network Access - Atlas App from Other Devices

## The Issue
Your Atlas app runs on `localhost:5000` by default, which only allows connections from the same computer. To access it from other devices on your network, you need to:

1. **Bind to all network interfaces** (0.0.0.0)
2. **Find your computer's IP address**
3. **Configure Windows Firewall**
4. **Use the correct URL from other devices**

## ✅ Complete Solution

### Step 1: Find Your Computer's IP Address

**Windows Command Prompt:**
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.0.x.x)

**Example output:**
```
Ethernet adapter Ethernet:
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

### Step 2: Configure Windows Firewall

**Option A: Allow through Windows Firewall (Recommended)**
```cmd
# Run as Administrator
netsh advfirewall firewall add rule name="Atlas App" dir=in action=allow protocol=TCP localport=5000
```

**Option B: Temporarily disable Windows Firewall (Quick test)**
1. Open Windows Security
2. Go to Firewall & network protection
3. Turn off firewall for Private networks (temporarily)

### Step 3: Start Atlas with Network Binding

**Create a batch file `start-atlas.bat`:**
```cmd
@echo off
set NODE_ENV=development
set PORT=5000
echo Starting Atlas Document Management System...
echo.
echo Access locally: http://localhost:5000
echo Access from network: http://192.168.1.100:5000
echo (Replace 192.168.1.100 with your actual IP address)
echo.
npx tsx server/index.ts
pause
```

**Or run directly:**
```cmd
set NODE_ENV=development && set PORT=5000 && npx tsx server/index.ts
```

### Step 4: Access from Other Devices

From any device on the same network (phone, tablet, other computers):
```
http://YOUR_IP_ADDRESS:5000
```

**Example:**
```
http://192.168.1.100:5000
```

## 🔧 Advanced Network Configuration

### For Corporate Networks
```cmd
# Check if port 5000 is blocked
telnet YOUR_IP_ADDRESS 5000

# Try alternative port (if 5000 is blocked)
set PORT=8080 && npx tsx server/index.ts
```

### For Wi-Fi Hotspot
If using phone hotspot, your IP might be:
- `192.168.43.x` (Android hotspot)
- `172.20.10.x` (iPhone hotspot)

### Router Port Forwarding (Internet Access)
1. Login to your router (usually 192.168.1.1)
2. Find "Port Forwarding" settings
3. Forward external port 5000 to your computer's IP:5000
4. Access via your public IP from anywhere

## 📱 Testing Network Access

### From Another Computer
```
# Test connection
ping 192.168.1.100

# Test port
telnet 192.168.1.100 5000
```

### From Phone/Tablet
1. Connect to same Wi-Fi network
2. Open browser
3. Go to: `http://192.168.1.100:5000`

## 🚀 Complete Setup Script

**Create `atlas-network.bat`:**
```cmd
@echo off
echo ========================================
echo Atlas Document Management System
echo Network Setup
echo ========================================
echo.

echo Finding your IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for %%b in (%%a) do (
        echo Your IP: %%b
        set MYIP=%%b
    )
)

echo.
echo Configuring firewall...
netsh advfirewall firewall delete rule name="Atlas App" >nul 2>&1
netsh advfirewall firewall add rule name="Atlas App" dir=in action=allow protocol=TCP localport=5000

echo.
echo Starting Atlas app...
echo Local access: http://localhost:5000
echo Network access: http://%MYIP%:5000
echo.

set NODE_ENV=development
set PORT=5000
npx tsx server/index.ts
```

## 📋 Quick Checklist

✅ **Step 1:** Find your IP address (`ipconfig`)
✅ **Step 2:** Allow port 5000 through firewall
✅ **Step 3:** Start Atlas app
✅ **Step 4:** Test from another device: `http://YOUR_IP:5000`

Your Atlas Document Management System with all 490+ documents will be accessible to your entire team on the network!

## 🔒 Security Notes

- **Firewall rule** only allows port 5000
- **Network access** limited to local network only
- **No internet exposure** unless you configure port forwarding
- **Login system** still protects your data

Your Atlas app will maintain all functionality - Excel processing, real-time analytics, document management - accessible from any device on your network.