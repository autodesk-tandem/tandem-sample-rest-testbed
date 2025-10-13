# Tandem REST API TestBed

## Overview

This sample is a test bed application for exercising the Tandem REST API in an interactive environment.

It is designed to bring in as few dependencies as possible.  It is plain Javascript and HTML with the exception of jQuery and Bootstrap just to do minimal styling.  The app is designed as simple "Stubs" of functionality that for the most part just dump out results to the Chrome console window.  These interactive tests will surface useful information that you can then use in some of your other code (e.g., URNs for Facilities, Models, etc.). In cases where input is required from the user, the UI is as minimal as possible, or you are expected to change the code itself that supplies that input, or put a breakpoint in the debugger and change the value temporarily.

*NOTE: There is also a Postman Collection available for testing the REST API endpoints.  See [Postman Collection](https://documenter.getpostman.com/view/15787353/2s9YXk2faD) for more information.*

![Tandem TestBed App 001](./docs/Readme_img_001.png)



## Live Demo

If you just want to run the application without modifying source code, please visit: https://autodesk-tandem.github.io/tandem-sample-rest-testbed/

Login with your Autodesk ID and then choose one of the Facilities you have access to.  If you have not yet used Tandem, you will first need to do the following:
1. Sign up for a free Tandem account: [Tandem signup](https://intandem.autodesk.com/contact-us/?form_type=account#contact-forms)
2. Set up a Facility by importing models and assigning Parameters via Classification: https://tandem.autodesk.com
3. See https://intandem.autodesk.com/resources/ for more information on how to do this.



## Running Locally

If you would like to use the source to debug or extend with your own test stub functions, follow these steps:

1. Clone the repository to your local machine
2. Make sure you have an account and access to at least one facility at https://tandem.autodesk.com
3. Create a new Application on the APS Developer Portal to get your Client_ID: https://aps.autodesk.com

![Tandem TestBed App 010](./docs/Readme_img_010.png)
![Tandem TestBed App 011](./docs/Readme_img_011.png)
![Tandem TestBed App 012](./docs/Readme_img_012.png)


## Setup and Configuration

1. Add your application Client_ID to the code. Find the appropriate lines in the file `env.js` and replace with your APS Client ID from https://aps.autodesk.com

![Tandem TestBed App 020](./docs/Readme_img_020.png)

2. If you are developing internally at Autodesk, make sure to use the appropriate environment consistently. Depending on whether you are using STAGING or PRODUCTION (as shown in the image above), set the Viewer to load into the HTML page using the same environment.

![Tandem TestBed App 021](./docs/Readme_img_021.png)



## Start App

Start a local server by running `python3 -m http.server` in a terminal window. Then open the Chrome browser and go to http://localhost:8000

Login to your account to get access to your Facilities.  If you don't have any facilities yet, create one using the Tandem product.



## Using the App

![Tandem TestBed App 040](./docs/Readme_img_040.png)

Many of the functions will not be interesting until you have setup a Facility with a Template and Classifications.  For example, to set user-defined property data on an asset, like in the following example, that property has to exist in the Facility Template and the asset must have been classified correctly to use it.

![Tandem TestBed App 041](./docs/Readme_img_041.png)

Some properties are built-in and should be more standard on most models, like in the following example.

![Tandem TestBed App 042](./docs/Readme_img_042.png)


*NOTE: if you are testing the REST API using the Postman collection, this Test Bed App is very useful for retrieving URNS, and other information that needs to be supplied to the REST API.*
