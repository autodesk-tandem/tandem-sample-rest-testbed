# Quick Start Guide

## ✅ Project Complete!

Your new Tandem REST API Testbed is ready to use. Here's what was created:

### 📁 Project Structure

```
tandem-sample-rest-testbed/
├── index.html                    ✅ Modern dark-mode UI with Tailwind CSS
├── js/
│   ├── app.js                   ✅ Main app (login, facility selection)
│   ├── auth.js                  ✅ OAuth authentication (PKCE)
│   ├── api.js                   ✅ Core API utilities
│   ├── config.js                ✅ Environment configuration
│   ├── stubs/
│   │   └── facilityStubs.js    ✅ STUB functions (API examples)
│   └── ui/
│       └── stubUI.js           ✅ UI rendering (separate from logic)
├── tandem/
│   ├── constants.js             ✅ Tandem constants
│   └── keys.js                  ✅ Key utilities
├── README.md                     ✅ Comprehensive documentation
├── LICENSE                       ✅ MIT License
├── .gitignore                    ✅ Git ignore rules
└── package.json                  ✅ Package metadata
```

### 🚀 Test It Now!

#### 1. Start the Server

Open a terminal in the project directory and run:

```bash
cd /Users/awej/dev/tandem/tandem-sample-rest-testbed

# Option 1: Python
python3 -m http.server 8000

# Option 2: Node.js
npx http-server -p 8000
```

#### 2. Open Your Browser

Navigate to: **http://localhost:8000**

#### 3. Open Chrome DevTools

**IMPORTANT**: Press F12 or Cmd+Option+I to open the console!

All STUB output goes to the console - this is intentional for learning.

#### 4. Sign In

Click "Sign In" and authenticate with your Autodesk account.

#### 5. Select a Facility

Choose an account and facility from the dropdowns.

#### 6. Click a STUB Button

Try "GET Facility Info" - watch the console for detailed output!

### 🎯 What You'll See

When you click "GET Facility Info", the console will show:

```
🔍 STUB: getFacilityInfo()
📋 Purpose: Get complete facility information
📚 API Docs: https://aps.autodesk.com/en/docs/tandem/v1/...
🌐 Request URL: https://developer.api.autodesk.com/tandem/v1/twins/...
🗺️  Region: US
⚙️  Method: GET
🔑 Auth: Bearer token (from session storage)
📤 Sending request...
📥 Response status: 200 OK
✅ Success! API returned facility info:
📦 Facility Data: {...}  // <-- Click to expand!

🔎 Key Information:
  • Building Name: My Building
  • Template: Default Template
  • Schema Version: 2
  • Number of Models: 3
  • Region: us
```

### 📚 Available STUB Functions

Currently implemented:

1. **GET Facility Info** - Complete facility information
2. **GET Facility Template** - Classification system and parameters
3. **GET Facility Users** - Who has access and their permissions
4. **GET Saved Views** - Camera positions and visibility settings

### 🔧 Adding More STUBs

Want to add more API endpoints? It's easy!

#### Step 1: Add STUB Function

Edit `js/stubs/facilityStubs.js`:

```javascript
export async function getNewEndpoint(facilityURN, region) {
  console.group("🔍 STUB: getNewEndpoint()");
  console.log("📋 Purpose: Description here");
  
  const requestPath = `${tandemBaseURL}/your-endpoint-here`;
  console.log("🌐 Request URL:", requestPath);
  
  try {
    const response = await fetch(requestPath, makeRequestOptionsGET(region));
    const data = await response.json();
    console.log("✅ Success!");
    logResponse(data);
  } catch (error) {
    console.error("❌ Error:", error);
  }
  
  console.groupEnd();
}
```

#### Step 2: Add UI Button

Edit `js/ui/stubUI.js` in the `renderStubs()` function:

```javascript
facilitySection.appendChild(createStubButton(
  'GET New Endpoint',
  'Description of what this does',
  () => facilityStubs.getNewEndpoint(currentFacilityURN, currentFacilityRegion)
));
```

Refresh the page - your new button is ready!

### 🎓 Key Features

#### Clean Separation of Concerns

- **STUB files** (`js/stubs/`) = Pure API logic
- **UI files** (`js/ui/`) = Rendering and user interaction
- **Core utilities** (`js/api.js`) = Shared functions

This makes it easy to:
- Understand each part independently
- Copy STUB functions to your own projects
- Modify UI without touching API logic

#### Educational Console Output

Every STUB function includes:
- 📋 Purpose statement
- 🌐 Exact API URL being called
- ⚙️  HTTP method
- 🔑 Authentication details
- 📦 Full response data
- 🔎 Highlighted key information

#### Modern UI

- Dark mode design (easy on the eyes)
- Tailwind CSS styling
- Responsive layout
- Clean, professional look

### 🔍 Troubleshooting

#### "No facilities found"
Make sure you have access to Tandem facilities on your Autodesk account.

#### Console is empty
Did you open Chrome DevTools? (F12 or Cmd+Option+I)

#### 401 Unauthorized errors
Sign out and sign in again to refresh your token.

### 📖 Next Steps

1. **Read the README.md** - Comprehensive documentation
2. **Try all the STUBs** - Explore different API endpoints
3. **Check the Network tab** - See actual HTTP requests
4. **Add more STUBs** - Practice with other endpoints
5. **Build something** - Use what you learned!

### 🔗 Resources

- [README.md](./README.md) - Full documentation
- [Tandem API Docs](https://aps.autodesk.com/en/docs/tandem/v1/developers_guide/overview/)
- [APS Developer Portal](https://aps.autodesk.com/)

---

**Happy coding! 🚀**

Questions? Check the console - it has all the answers!


