import { tandemBaseURL, makeRequestOptionsGET, makeRequestOptionsPOST } from '../api.js';
import { ColumnFamilies, ColumnNames, MutateActions } from '../../tandem/constants.js';

/**
 * Get the schema for a specific model, then search for a qualified property by category and name
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} categoryName - Property category name
 * @param {string} propName - Property name
 * @returns {Promise<void>}
 */
export async function getQualifiedProperty(facilityURN, region, categoryName, propName) {
  console.group("STUB: getQualifiedProperty()");
  
  // Get list of models for this facility
  const facilityPath = `${tandemBaseURL}/twins/${facilityURN}`;
  console.log(facilityPath);
  
  try {
    const facilityResponse = await fetch(facilityPath, makeRequestOptionsGET(region));
    const facilityData = await facilityResponse.json();
    const models = facilityData.links || [];
    
    // Loop through each model
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const modelLabel = model.label || `Model ${i}`;
      const modelURN = model.modelId;
      
      console.group(`Model[${i}] --> ${modelLabel}`);
      console.log(`Model URN: ${modelURN}`);
      
      // Get schema for this model
      const schemaPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
      console.log(schemaPath);
      
      const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
      const schema = await schemaResponse.json();
      
      // Search for the qualified property
      const qualProps = [];
      const attrs = schema.attributes || [];
      
      for (let j = 0; j < attrs.length; j++) {
        if (attrs[j].category === categoryName && attrs[j].name === propName) {
          qualProps.push(attrs[j]);
        }
      }
      
      if (qualProps.length > 0) {
        if (qualProps.length === 1) {
          console.log(`Qualified Property for [${categoryName} | ${propName}]:`, qualProps[0]);
        } else {
          console.warn("WARNING: Multiple qualified properties found for this name...");
          qualProps.forEach((prop, idx) => {
            console.log(`Qualified Property [${idx}] for [${categoryName} | ${propName}]:`, prop);
          });
        }
      } else {
        console.log(`Could not find [${categoryName} | ${propName}]`);
      }
      
      console.groupEnd();
    }
  } catch (error) {
    console.error('Error fetching qualified property:', error);
  }
  
  console.groupEnd();
}

/**
 * Scan for elements that have a specific qualified property
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} categoryName - Property category name
 * @param {string} propName - Property name
 * @param {boolean} includeHistory - Whether to include property history
 * @returns {Promise<void>}
 */
export async function scanForProperty(facilityURN, region, categoryName, propName, includeHistory) {
  console.group("STUB: scanForProperty()");
  
  const facilityPath = `${tandemBaseURL}/twins/${facilityURN}`;
  console.log(facilityPath);
  
  try {
    const facilityResponse = await fetch(facilityPath, makeRequestOptionsGET(region));
    const facilityData = await facilityResponse.json();
    const models = facilityData.links || [];
    
    // Loop through each model
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const modelLabel = model.label || `Model ${i}`;
      const modelURN = model.modelId;
      
      console.group(`Model[${i}] --> ${modelLabel}`);
      console.log(`Model URN: ${modelURN}`);
      
      // First, get the qualified property ID from the schema
      const schemaPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
      console.log(schemaPath);
      
      const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
      const schema = await schemaResponse.json();
      
      // Search for the qualified property
      const qualProps = [];
      const attrs = schema.attributes || [];
      
      for (let j = 0; j < attrs.length; j++) {
        if (attrs[j].category === categoryName && attrs[j].name === propName) {
          qualProps.push(attrs[j]);
        }
      }
      
      if (qualProps.length > 0) {
        // Build qualified columns array
        const qualifiedColumns = qualProps.map(prop => prop.id);
        
        // Now scan for elements with this property
        const bodyPayload = JSON.stringify({
          qualifiedColumns: qualifiedColumns,
          includeHistory: includeHistory
        });
        
        const scanPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
        console.log(scanPath);
        console.log(`Include History: ${includeHistory}`);
        
        const scanResponse = await fetch(scanPath, makeRequestOptionsPOST(bodyPayload, region));
        const scanData = await scanResponse.json();
        console.log("Result from Tandem DB Server -->", scanData);
        
        // Also show a nice table of the property values
        const propValues = [];
        for (let k = 1; k < scanData.length; k++) {
          const rowObj = scanData[k];
          if (rowObj) {
            const key = rowObj.k;
            for (let m = 0; m < qualProps.length; m++) {
              const prop = rowObj[qualProps[m].id];
              if (prop) {
                if (includeHistory) {
                  propValues.push({ key: key, prop: qualProps[m].id, value: prop });
                } else {
                  propValues.push({ key: key, prop: qualProps[m].id, value: prop[0] });
                }
              }
            }
          }
        }
        
        if (propValues.length > 0) {
          console.table(propValues);
        }
      } else {
        console.log(`Could not find [${categoryName} | ${propName}] in this model`);
      }
      
      console.groupEnd();
    }
  } catch (error) {
    console.error('Error scanning for property:', error);
  }
  
  console.groupEnd();
}

/**
 * Scan for all user-defined properties (DtProperties family = "z")
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function scanForUserProps(facilityURN, region) {
  console.group("STUB: scanForUserProps()");
  
  try {
    // Get list of models for this facility
    const facilityPath = `${tandemBaseURL}/twins/${facilityURN}`;
    console.log(facilityPath);
    
    const facilityResponse = await fetch(facilityPath, makeRequestOptionsGET(region));
    const facilityData = await facilityResponse.json();
    const models = facilityData.links || [];
    
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const modelLabel = model.label || `Model ${i}`;
      const modelURN = model.modelId;
      
      console.group(`Model[${i}] --> ${modelLabel}`);
      console.log(`Model URN: ${modelURN}`);
      
      const bodyPayload = JSON.stringify({
        families: [ColumnFamilies.DtProperties],
        includeHistory: false
      });
      
      const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
      console.log(requestPath);
      
      const response = await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region));
      const obj = await response.json();
      console.log("Result from Tandem DB Server -->", obj);
      
      console.groupEnd();
    }
  } catch (error) {
    console.error('Error scanning for user props:', error);
  }
  
  console.groupEnd();
}

/**
 * Find elements where a property value matches based on type-aware criteria
 * Supports: string (partial/exact/regex), numeric (=,!=,>,>=,<,<=), boolean
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} categoryName - Property category name
 * @param {string} propName - Property name
 * @param {Object} searchOptions - Search options object
 * @param {string} searchOptions.dataType - 'string', 'numeric', or 'boolean'
 * For string: { matchType: 'partial'|'exact'|'regex', caseInsensitive: boolean, value: string }
 * For numeric: { operator: '='|'!='|'>'|'>='|'<'|'<=', value: number }
 * For boolean: { value: boolean }
 * @returns {Promise<void>}
 */
export async function findElementsWherePropValueEquals(facilityURN, region, categoryName, propName, searchOptions) {
  console.group("STUB: findElementsWherePropValueEquals()");
  console.log("Search options:", searchOptions);
  
  const facilityPath = `${tandemBaseURL}/twins/${facilityURN}`;
  console.log(facilityPath);
  
  // Build the matcher function based on data type
  let matcher;
  const dataType = searchOptions?.dataType || 'string';
  
  if (dataType === 'boolean') {
    const targetValue = searchOptions.value;
    console.log(`Matching boolean value: ${targetValue}`);
    matcher = (val) => {
      if (typeof val === 'boolean') return val === targetValue;
      const valStr = String(val).toLowerCase();
      return valStr === (targetValue ? 'true' : 'false') || 
             valStr === (targetValue ? '1' : '0');
    };
  } else if (dataType === 'numeric') {
    const targetValue = searchOptions.value;
    const operator = searchOptions.operator || '=';
    console.log(`Matching numeric value: ${operator} ${targetValue}`);
    matcher = (val) => {
      const numVal = typeof val === 'number' ? val : parseFloat(val);
      if (isNaN(numVal)) return false;
      switch (operator) {
        case '=': return numVal === targetValue;
        case '!=': return numVal !== targetValue;
        case '>': return numVal > targetValue;
        case '>=': return numVal >= targetValue;
        case '<': return numVal < targetValue;
        case '<=': return numVal <= targetValue;
        default: return numVal === targetValue;
      }
    };
  } else {
    // String matching
    const value = searchOptions?.value || '';
    const matchType = searchOptions?.matchType || 'partial';
    const caseInsensitive = searchOptions?.caseInsensitive || false;
    
    if (matchType === 'regex') {
      try {
        const regex = new RegExp(value, caseInsensitive ? 'i' : '');
        console.log(`Matching regex: ${regex}`);
        matcher = (val) => regex.test(String(val));
      } catch (e) {
        console.error('Invalid regex:', e.message);
        console.log("TIP: Use 'Partial' or 'Exact' match type for literal string matching.");
        matcher = (val) => {
          const valStr = String(val);
          return caseInsensitive 
            ? valStr.toLowerCase().includes(value.toLowerCase())
            : valStr.includes(value);
        };
      }
    } else if (matchType === 'exact') {
      console.log(`Matching exact: "${value}" (case insensitive: ${caseInsensitive})`);
      matcher = (val) => {
        const valStr = String(val);
        return caseInsensitive 
          ? valStr.toLowerCase() === value.toLowerCase()
          : valStr === value;
      };
    } else {
      // Partial match (default)
      console.log(`Matching partial: "${value}" (case insensitive: ${caseInsensitive})`);
      matcher = (val) => {
        const valStr = String(val);
        return caseInsensitive 
          ? valStr.toLowerCase().includes(value.toLowerCase())
          : valStr.includes(value);
      };
    }
  }
  
  try {
    const facilityResponse = await fetch(facilityPath, makeRequestOptionsGET(region));
    const facilityData = await facilityResponse.json();
    const models = facilityData.links || [];
    
    // Loop through each model
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const modelLabel = model.label || `Model ${i}`;
      const modelURN = model.modelId;
      
      console.group(`Model[${i}] --> ${modelLabel}`);
      console.log(`Model URN: ${modelURN}`);
      
      // First, get the qualified property ID from the schema
      const schemaPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
      console.log(schemaPath);
      
      const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
      const schema = await schemaResponse.json();
      
      // Search for the qualified property
      const qualProps = [];
      const attrs = schema.attributes || [];
      
      for (let j = 0; j < attrs.length; j++) {
        if (attrs[j].category === categoryName && attrs[j].name === propName) {
          qualProps.push(attrs[j]);
        }
      }
      
      if (qualProps.length > 0) {
        // Build qualified columns array
        const qualifiedColumns = qualProps.map(prop => prop.id);
        
        // Scan for elements with this property
        const bodyPayload = JSON.stringify({
          qualifiedColumns: qualifiedColumns,
          includeHistory: false
        });
        
        const scanPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
        console.log(scanPath);
        
        const scanResponse = await fetch(scanPath, makeRequestOptionsPOST(bodyPayload, region));
        const rawProps = await scanResponse.json();
        
        // Extract property values
        const propValues = [];
        for (let k = 1; k < rawProps.length; k++) {
          const rowObj = rawProps[k];
          if (rowObj) {
            const key = rowObj.k;
            for (let m = 0; m < qualProps.length; m++) {
              const prop = rowObj[qualProps[m].id];
              if (prop) {
                propValues.push({ 
                  modelURN: modelURN, 
                  key: key, 
                  prop: qualProps[m].id, 
                  value: prop[0] 
                });
              }
            }
          }
        }
        
        if (propValues.length > 0) {
          console.log("Raw properties returned-->", rawProps);
          console.log("Extracted properties-->", propValues);
          
          // Filter using the type-aware matcher
          const matchingProps = propValues.filter(prop => matcher(prop.value));
          
          if (matchingProps.length > 0) {
            console.log("Matching property values-->");
            console.table(matchingProps);
          } else {
            console.log("No elements found matching criteria");
          }
        } else {
          console.log("Could not find any elements with that property: ", propName);
        }
      } else {
        console.log(`Could not find [${categoryName} | ${propName}] in this model`);
      }
      
      console.groupEnd();
    }
  } catch (error) {
    console.error('Error finding elements:', error);
  }
  
  console.groupEnd();
}

/**
 * Scan all elements in a model with no filters (brute force)
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @returns {Promise<void>}
 */
export async function getScanBruteForce(modelURN, region) {
  console.group("STUB: getScanBruteForce()");
  
  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
  console.log(requestPath);
  
  await fetch(requestPath, makeRequestOptionsGET(region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));
  
  console.groupEnd();
}

/**
 * Scan for elements with specific options (element keys, history, column families)
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} elemKeys - Comma-separated element keys (optional)
 * @param {boolean} includeHistory - Whether to include history
 * @param {string} colFamilies - Comma-separated column families (e.g., "n,z,l")
 * @returns {Promise<void>}
 */
export async function getScanElementsOptions(modelURN, region, elemKeys, includeHistory, colFamilies) {
  console.group("STUB: getScanElementsOptions()");
  
  let elemKeysArray = [];
  if (elemKeys === "") {
    console.log("No element keys specified, scanning entire model...");
  } else {
    elemKeysArray = elemKeys.split(',').map(k => k.trim());
    console.log("Scanning for specific element keys", elemKeysArray);
  }
  
  let familiesArray = [];
  if (colFamilies === "") {
    console.log("No column families specified, returning all...");
  } else {
    familiesArray = colFamilies.split(',').map(f => f.trim());
    console.log("Scanning for column families", familiesArray);
  }
  
  const bodyPayload = JSON.stringify({
    families: familiesArray.length > 0 ? familiesArray : undefined,
    includeHistory: includeHistory,
    keys: elemKeysArray.length > 0 ? elemKeysArray : undefined
  });
  
  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
  console.log(requestPath);
  console.log("Payload:", bodyPayload);
  
  await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));
  
  console.groupEnd();
}

/**
 * Scan for elements with specific qualified property columns
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} elemKeys - Comma-separated element keys (optional)
 * @param {boolean} includeHistory - Whether to include history
 * @param {string} qualProps - Comma-separated qualified properties (e.g., "z:5mQ,n:n")
 * @returns {Promise<void>}
 */
export async function getScanElementsQualProps(modelURN, region, elemKeys, includeHistory, qualProps) {
  console.group("STUB: getScanElementsQualProps()");
  
  let elemKeysArray = [];
  if (elemKeys === "") {
    console.log("No element keys specified, scanning entire model...");
  } else {
    elemKeysArray = elemKeys.split(',').map(k => k.trim());
    console.log("Scanning for specific element keys", elemKeysArray);
  }
  
  let qualPropsArray = [];
  if (qualProps === "") {
    console.log("No qualified properties specified, returning all...");
  } else {
    qualPropsArray = qualProps.split(',').map(p => p.trim());
    console.log("Scanning for specific qualified properties", qualPropsArray);
  }
  
  const bodyPayload = JSON.stringify({
    qualifiedColumns: qualPropsArray.length > 0 ? qualPropsArray : undefined,
    includeHistory: includeHistory,
    keys: elemKeysArray.length > 0 ? elemKeysArray : undefined
  });
  
  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
  console.log(requestPath);
  console.log("Payload:", bodyPayload);
  
  await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));
  
  console.groupEnd();
}

/**
 * Get the full change history of all properties for the given elements
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} elemKeys - Comma-separated element keys
 * @returns {Promise<void>}
 */
export async function getScanElementsFullChangeHistory(modelURN, region, elemKeys) {
  console.group("STUB: getScanElementsFullChangeHistory()");
  
  if (elemKeys === "") {
    console.error("ERROR: Element keys are required for this operation");
    console.groupEnd();
    return;
  }
  
  const elemKeysArray = elemKeys.split(',').map(k => k.trim());
  console.log("Element keys", elemKeysArray);
  
  const bodyPayload = JSON.stringify({
    includeHistory: true,
    keys: elemKeysArray
  });
  
  const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/scan`;
  console.log(requestPath);
  console.log("Payload:", bodyPayload);
  
  await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
    .then((response) => response.json())
    .then((obj) => {
      console.log("Result from Tandem DB Server -->", obj);
    })
    .catch(error => console.log('error', error));
  
  console.groupEnd();
}

/**
 * Assign a classification to elements
 * 
 * @param {string} facilityURN - Facility URN
 * @param {string} region - Region header
 * @param {string} classificationStr - Classification string (e.g., "Walls > Curtain Wall")
 * @param {string} modelURN - Model URN
 * @param {string} elementKeys - Comma-separated element keys
 * @returns {Promise<void>}
 */
export async function assignClassification(facilityURN, region, classificationStr, modelURN, elementKeys) {
  console.group("STUB: assignClassification()");
  
  // First, validate the classification exists in the facility template
  const templatePath = `${tandemBaseURL}/twins/${facilityURN}/inlinetemplate`;
  console.log(templatePath);
  
  try {
    const templateResponse = await fetch(templatePath, makeRequestOptionsGET(region));
    const template = await templateResponse.json();
    
    // Search for the classification node
    let classificationNode = null;
    
    function findClassification(nodes, searchStr) {
      if (!nodes) return null;
      for (const node of nodes) {
        if (node.name === searchStr || node.fullName === searchStr) {
          return node;
        }
        if (node.children) {
          const found = findClassification(node.children, searchStr);
          if (found) return found;
        }
      }
      return null;
    }
    
    if (template.classification) {
      classificationNode = findClassification(template.classification, classificationStr);
    }
    
    if (!classificationNode) {
      console.error(`Could not find classification "${classificationStr}" in the facility template.`);
      console.log("TIP: Use GET Facility Inline Template to see available classifications.");
      console.groupEnd();
      return;
    }
    
    console.log("Classification node found:", classificationNode);
    
    // Parse element keys
    const elementKeysArray = elementKeys.split(',').map(k => k.trim());
    if (elementKeysArray.length === 0 || elementKeysArray[0] === "") {
      console.error("ERROR: No element keys specified.");
      console.groupEnd();
      return;
    }
    
    console.log("Element keys:", elementKeysArray);
    console.log(`Setting classification to "${classificationStr}"`);
    
    // Create the mutations array
    const mutsArray = [];
    for (let i = 0; i < elementKeysArray.length; i++) {
      // MutateActions.Insert, ColumnFamilies.Standard:ColumnNames.OClassification to override classification
      const mutObj = [MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.OClassification, classificationStr];
      mutsArray.push(mutObj);
    }
    
    // Create the payload for the call to /mutate
    const bodyPayload = JSON.stringify({
      keys: elementKeysArray,
      muts: mutsArray,
      desc: "REST TestBedApp: updated classification"
    });
    
    const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/mutate`;
    console.log(requestPath);
    console.log("Payload:", bodyPayload);
    
    await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
      .then((response) => response.json())
      .then((obj) => {
        console.log("Result from Tandem DB Server -->", obj);
      })
      .catch(error => console.log('error', error));
      
  } catch (error) {
    console.error('Error assigning classification:', error);
  }
  
  console.groupEnd();
}

/**
 * Set property values on elements using category and property name
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} propCategory - Property category name
 * @param {string} propName - Property name
 * @param {string} propVal - Property value to set
 * @param {string} elementKeys - Comma-separated element keys
 * @returns {Promise<void>}
 */
export async function setPropertySelSet(modelURN, region, propCategory, propName, propVal, elementKeys) {
  console.group("STUB: setPropertySelSet()");
  
  // First, find the qualified property from the schema
  const schemaPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
  console.log(schemaPath);
  
  try {
    const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
    const schema = await schemaResponse.json();
    
    // Search for the qualified property
    let qualProp = null;
    const attrs = schema.attributes || [];
    
    for (let j = 0; j < attrs.length; j++) {
      if (attrs[j].category === propCategory && attrs[j].name === propName) {
        qualProp = attrs[j];
        break;
      }
    }
    
    if (!qualProp) {
      console.error(`Could not find property "${propCategory} | ${propName}" in model schema.`);
      console.log("TIP: Use GET Model Data Schema to see available properties.");
      console.groupEnd();
      return;
    }
    
    console.log("Qualified property found:", qualProp);
    
    // Parse element keys
    const elementKeysArray = elementKeys.split(',').map(k => k.trim());
    if (elementKeysArray.length === 0 || elementKeysArray[0] === "") {
      console.error("ERROR: No element keys specified.");
      console.groupEnd();
      return;
    }
    
    // Parse the value based on data type
    let typedValue = propVal;
    if (qualProp.dataType === 1 || qualProp.dataType === 2) {
      // Integer or Float
      typedValue = parseFloat(propVal);
    } else if (qualProp.dataType === 3) {
      // Boolean
      typedValue = propVal.toLowerCase() === 'true';
    }
    
    console.log("Element keys:", elementKeysArray);
    console.log(`Setting value for "${propCategory} | ${propName}" =`, typedValue);
    
    // Extract family and column from qualified property ID
    const [fam, col] = qualProp.id.split(':');
    
    // Create the mutations array
    const mutsArray = [];
    for (let i = 0; i < elementKeysArray.length; i++) {
      const mutObj = [MutateActions.Insert, fam, col, typedValue];
      mutsArray.push(mutObj);
    }
    
    // Create the payload for the call to /mutate
    const bodyPayload = JSON.stringify({
      keys: elementKeysArray,
      muts: mutsArray,
      desc: "REST TestBedApp: updated property"
    });
    
    const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/mutate`;
    console.log(requestPath);
    console.log("Payload:", bodyPayload);
    
    await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
      .then((response) => response.json())
      .then((obj) => {
        console.log("Result from Tandem DB Server -->", obj);
      })
      .catch(error => console.log('error', error));
      
  } catch (error) {
    console.error('Error setting property:', error);
  }
  
  console.groupEnd();
}

/**
 * Set property values on elements using qualified property ID directly
 * 
 * @param {string} modelURN - Model URN
 * @param {string} region - Region header
 * @param {string} qualPropStr - Qualified property string (e.g., "z:5mQ")
 * @param {string} propVal - Property value to set
 * @param {string} elementKeys - Comma-separated element keys
 * @returns {Promise<void>}
 */
export async function setPropertySelSetQP(modelURN, region, qualPropStr, propVal, elementKeys) {
  console.group("STUB: setPropertySelSetQP()");
  
  // First, find the qualified property from the schema to get the data type
  const schemaPath = `${tandemBaseURL}/modeldata/${modelURN}/schema`;
  console.log(schemaPath);
  
  try {
    const schemaResponse = await fetch(schemaPath, makeRequestOptionsGET(region));
    const schema = await schemaResponse.json();
    
    // Search for the qualified property by ID
    let qualProp = null;
    const attrs = schema.attributes || [];
    
    for (let j = 0; j < attrs.length; j++) {
      if (attrs[j].id === qualPropStr) {
        qualProp = attrs[j];
        break;
      }
    }
    
    if (!qualProp) {
      console.warn(`Property "${qualPropStr}" not found in schema. Proceeding with string value.`);
    } else {
      console.log("Qualified property found:", qualProp);
    }
    
    // Parse element keys
    const elementKeysArray = elementKeys.split(',').map(k => k.trim());
    if (elementKeysArray.length === 0 || elementKeysArray[0] === "") {
      console.error("ERROR: No element keys specified.");
      console.groupEnd();
      return;
    }
    
    // Parse the value based on data type if we found the property
    let typedValue = propVal;
    if (qualProp) {
      if (qualProp.dataType === 1 || qualProp.dataType === 2) {
        // Integer or Float
        typedValue = parseFloat(propVal);
      } else if (qualProp.dataType === 3) {
        // Boolean
        typedValue = propVal.toLowerCase() === 'true';
      }
    }
    
    // Parse family and column from qualified property string
    const parts = qualPropStr.split(':');
    if (parts.length !== 2) {
      console.error(`Invalid qualified property format: "${qualPropStr}". Expected format: "family:column" (e.g., "z:5mQ")`);
      console.groupEnd();
      return;
    }
    const [fam, col] = parts;
    
    console.log("Element keys:", elementKeysArray);
    console.log(`Setting value for "${qualPropStr}" =`, typedValue);
    
    // Create the mutations array
    const mutsArray = [];
    for (let i = 0; i < elementKeysArray.length; i++) {
      const mutObj = [MutateActions.Insert, fam, col, typedValue];
      mutsArray.push(mutObj);
    }
    
    // Create the payload for the call to /mutate
    const bodyPayload = JSON.stringify({
      keys: elementKeysArray,
      muts: mutsArray,
      desc: "REST TestBedApp: updated property"
    });
    
    const requestPath = `${tandemBaseURL}/modeldata/${modelURN}/mutate`;
    console.log(requestPath);
    console.log("Payload:", bodyPayload);
    
    await fetch(requestPath, makeRequestOptionsPOST(bodyPayload, region))
      .then((response) => response.json())
      .then((obj) => {
        console.log("Result from Tandem DB Server -->", obj);
      })
      .catch(error => console.log('error', error));
      
  } catch (error) {
    console.error('Error setting property:', error);
  }
  
  console.groupEnd();
}

