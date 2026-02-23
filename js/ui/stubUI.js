/**
 * STUB UI Rendering
 * 
 * This module handles the UI for STUB functions - buttons, input forms, etc.
 * It's separated from the STUB logic to maintain clean separation of concerns.
 * 
 * PATTERN:
 * - Each STUB function gets a button or expandable section
 * - Click handlers are attached to execute the STUB functions
 * - Results go to console (not displayed in UI) for educational purposes
 */

import * as facilityStubs from '../stubs/facilityStubs.js';
import * as modelStubs from '../stubs/modelStubs.js';
import * as propertyStubs from '../stubs/propertyStubs.js';
import * as groupStubs from '../stubs/groupStubs.js';
import * as streamStubs from '../stubs/streamStubs.js';
import * as documentStubs from '../stubs/documentStubs.js';
import * as miscStubs from '../stubs/miscStubs.js';
import * as appStubs from '../stubs/appStubs.js';
import * as sdkStubs from '../stubs/sdkStubs.js';
import { getDefaultModelURN, getModels } from '../api.js';
import { getCachedGroups, getCurrentGroupURN } from '../app.js';
import { getUniqueCategoryNames, getUniquePropertyNames, areSchemasLoaded, getPropertyInfo, getPropertyInfoByQualifiedId, DataTypes } from '../state/schemaCache.js';

// Store current facility context for STUB functions
let currentFacilityURN = null;
let currentFacilityRegion = null;
let currentModels = [];
let explicitGroupsCache = null; // Set when user explicitly calls GET Groups (All)

/**
 * Get groups for dropdown - uses explicit cache if available, otherwise app's cached groups
 */
function getGroupsForDropdown() {
  if (explicitGroupsCache !== null) {
    return explicitGroupsCache;
  }
  return getCachedGroups();
}

// Helper functions to remember last used input values
function saveInputValue(key, value) {
  sessionStorage.setItem(`stub_input_${key}`, value);
}

function getLastInputValue(key, defaultValue) {
  const saved = sessionStorage.getItem(`stub_input_${key}`);
  return saved !== null ? saved : defaultValue;
}

// Generate unique ID for datalist elements
let datalistIdCounter = 0;
function generateDatalistId() {
  return `datalist-${Date.now()}-${datalistIdCounter++}`;
}

/**
 * Create an autocomplete select dropdown for category or property names
 * 
 * @param {Object} field - Field configuration with id, placeholder, defaultValue, autocomplete type
 * @param {HTMLElement} inputForm - The parent form element (used to find related inputs)
 * @returns {HTMLSelectElement} The configured select element
 */
function createAutocompleteSelect(field, inputForm) {
  const select = document.createElement('select');
  select.id = field.id;
  select.className = 'w-full text-xs';
  
  let options = [];
  if (field.autocomplete === 'category') {
    options = getUniqueCategoryNames();
  } else if (field.autocomplete === 'property') {
    // Get properties, optionally filtered by category
    const categoryInput = inputForm.querySelector('#propCategory') || inputForm.querySelector('#categoryName');
    const categoryFilter = categoryInput ? categoryInput.value : null;
    options = getUniquePropertyNames(categoryFilter);
  }
  
  // Add all options (no placeholder needed - we auto-select first/last-used)
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    select.appendChild(option);
  });
  
  // Set default value: prefer last-used, otherwise first option
  const defaultValue = typeof field.defaultValue === 'function' 
    ? field.defaultValue() 
    : (field.defaultValue || '');
  if (defaultValue && options.includes(defaultValue)) {
    select.value = defaultValue;
  } else if (options.length > 0) {
    select.value = options[0];
  }
  
  // For property dropdown, update when category changes
  if (field.autocomplete === 'property') {
    const categoryInput = inputForm.querySelector('#propCategory') || inputForm.querySelector('#categoryName');
    if (categoryInput) {
      categoryInput.addEventListener('change', () => {
        const newOptions = getUniquePropertyNames(categoryInput.value || null);
        select.innerHTML = '';
        
        // Add all options (no placeholder - we auto-select)
        newOptions.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          select.appendChild(option);
        });
        
        // Try to select: 1) last used value if it exists in new list, or 2) first option
        const lastUsed = getLastInputValue('propName', '');
        if (lastUsed && newOptions.includes(lastUsed)) {
          select.value = lastUsed;
        } else if (newOptions.length > 0) {
          select.value = newOptions[0];
        }
        
        // Trigger change event so type-aware input updates
        select.dispatchEvent(new Event('change'));
      });
    }
  }
  
  // If options exist but no valid default was set, select the first option
  if (field.autocomplete === 'property' && options.length > 0 && !select.value) {
    const lastUsed = getLastInputValue('propName', '');
    if (lastUsed && options.includes(lastUsed)) {
      select.value = lastUsed;
    } else {
      select.value = options[0];
    }
  }
  
  return select;
}

/**
 * Shared helper to render a type-aware input element based on property info
 * 
 * @param {Object} propInfo - Property info object from schema
 * @param {HTMLElement} inputWrapper - Container for the input
 * @param {HTMLElement} typeIndicator - Element to show type info
 * @returns {HTMLElement} The created input element
 */
function renderTypeAwareInput(propInfo, inputWrapper, typeIndicator) {
  inputWrapper.innerHTML = '';
  let inputElement;
  
  if (propInfo && DataTypes.isBoolean(propInfo)) {
    // Boolean - create dropdown
    inputElement = document.createElement('select');
    inputElement.id = 'propVal';
    inputElement.className = 'w-full text-xs';
    
    const optTrue = document.createElement('option');
    optTrue.value = 'true';
    optTrue.textContent = 'True';
    
    const optFalse = document.createElement('option');
    optFalse.value = 'false';
    optFalse.textContent = 'False';
    
    inputElement.appendChild(optTrue);
    inputElement.appendChild(optFalse);
    
    typeIndicator.textContent = '📋 Boolean property - select True or False';
    typeIndicator.style.color = '#10b981';
    
  } else if (propInfo && DataTypes.isNumeric(propInfo)) {
    // Numeric - create number input
    inputElement = document.createElement('input');
    inputElement.type = 'number';
    inputElement.id = 'propVal';
    inputElement.placeholder = 'Enter a number...';
    inputElement.className = 'w-full text-xs';
    inputElement.step = propInfo.dataType === 2 ? '1' : 'any'; // dataType 2 = Integer
    
    typeIndicator.textContent = `🔢 ${DataTypes.getName(propInfo)} property - enter a number`;
    typeIndicator.style.color = '#3b82f6';
    
  } else {
    // String or unknown - text input
    inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.id = 'propVal';
    inputElement.placeholder = 'Enter text value...';
    inputElement.className = 'w-full text-xs';
    
    if (propInfo) {
      typeIndicator.textContent = `📝 ${DataTypes.getName(propInfo)} property`;
      typeIndicator.style.color = '#8b5cf6';
    } else {
      typeIndicator.textContent = '⚠️ Property not found in schema - using text input';
      typeIndicator.style.color = '#f59e0b';
    }
  }
  
  inputWrapper.appendChild(inputElement);
  return inputElement;
}

/**
 * Create a type-aware SEARCH input with matching options
 * Shows different options based on property dataType:
 * - String: match type (partial/exact/regex) + case insensitive
 * - Numeric: comparison operators (=, !=, >, >=, <, <=)
 * - Boolean: true/false radio buttons
 * 
 * @param {HTMLElement} inputForm - The parent form element
 * @param {string} categoryInputId - ID of the category input element
 * @param {string} propertyInputId - ID of the property input element
 * @returns {Object} Object with container, getValue, validate, and getSearchOptions methods
 */
function createTypeAwareSearchInput(inputForm, categoryInputId, propertyInputId) {
  const container = document.createElement('div');
  container.style.marginTop = '0.75rem';
  container.style.padding = '0.5rem';
  container.style.background = '#1f1f1f';
  container.style.border = '1px solid #404040';
  container.style.borderRadius = '0.25rem';
  
  let currentType = 'string'; // Track current detected type
  
  // Type indicator
  const typeIndicator = document.createElement('div');
  typeIndicator.style.fontSize = '0.65rem';
  typeIndicator.style.color = '#6b7280';
  typeIndicator.style.marginBottom = '0.5rem';
  typeIndicator.textContent = 'Property type: String (default)';
  container.appendChild(typeIndicator);
  
  // Value input label
  const valueLabel = document.createElement('label');
  valueLabel.textContent = 'Match Value';
  valueLabel.style.display = 'block';
  valueLabel.style.fontSize = '0.7rem';
  valueLabel.style.color = '#a0a0a0';
  valueLabel.style.marginBottom = '0.25rem';
  container.appendChild(valueLabel);
  
  // Value input
  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.id = 'searchMatchValue';
  valueInput.placeholder = 'e.g., Basic Wall or ^Concrete';
  valueInput.className = 'w-full text-xs';
  valueInput.style.marginBottom = '0.5rem';
  container.appendChild(valueInput);
  
  // --- String Options Section ---
  const stringOptions = document.createElement('div');
  stringOptions.id = 'stringSearchOptions';
  stringOptions.innerHTML = `
    <div style="margin-bottom: 0.5rem;">
      <label style="font-size: 0.7rem; color: #a0a0a0; display: block; margin-bottom: 0.25rem;">Match Type</label>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
          <input type="radio" name="searchMatchType" value="partial" checked style="accent-color: #0696D7; margin-right: 0.25rem;"> Partial
        </label>
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
          <input type="radio" name="searchMatchType" value="exact" style="accent-color: #0696D7; margin-right: 0.25rem;"> Exact
        </label>
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
          <input type="radio" name="searchMatchType" value="regex" style="accent-color: #0696D7; margin-right: 0.25rem;"> Regex
        </label>
      </div>
    </div>
    <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
      <input type="checkbox" id="searchCaseInsensitive" style="accent-color: #0696D7; margin-right: 0.25rem;"> Case Insensitive
    </label>
  `;
  container.appendChild(stringOptions);
  
  // --- Numeric Options Section (hidden by default) ---
  const numericOptions = document.createElement('div');
  numericOptions.id = 'numericSearchOptions';
  numericOptions.style.display = 'none';
  numericOptions.innerHTML = `
    <div>
      <label style="font-size: 0.7rem; color: #a0a0a0; display: block; margin-bottom: 0.25rem;">Comparison Operator</label>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
          <input type="radio" name="searchNumericOp" value="=" checked style="accent-color: #0696D7; margin-right: 0.25rem;"> =
        </label>
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
          <input type="radio" name="searchNumericOp" value="!=" style="accent-color: #0696D7; margin-right: 0.25rem;"> ≠
        </label>
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
          <input type="radio" name="searchNumericOp" value=">" style="accent-color: #0696D7; margin-right: 0.25rem;"> >
        </label>
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
          <input type="radio" name="searchNumericOp" value=">=" style="accent-color: #0696D7; margin-right: 0.25rem;"> ≥
        </label>
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
          <input type="radio" name="searchNumericOp" value="<" style="accent-color: #0696D7; margin-right: 0.25rem;"> <
        </label>
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
          <input type="radio" name="searchNumericOp" value="<=" style="accent-color: #0696D7; margin-right: 0.25rem;"> ≤
        </label>
      </div>
    </div>
  `;
  container.appendChild(numericOptions);
  
  // --- Boolean Options Section (hidden by default) ---
  const booleanOptions = document.createElement('div');
  booleanOptions.id = 'booleanSearchOptions';
  booleanOptions.style.display = 'none';
  booleanOptions.innerHTML = `
    <div>
      <label style="font-size: 0.7rem; color: #a0a0a0; display: block; margin-bottom: 0.25rem;">Boolean Value</label>
      <div style="display: flex; gap: 1rem;">
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
          <input type="radio" name="searchBooleanVal" value="true" checked style="accent-color: #0696D7; margin-right: 0.25rem;"> True
        </label>
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.7rem; color: #e0e0e0;">
          <input type="radio" name="searchBooleanVal" value="false" style="accent-color: #0696D7; margin-right: 0.25rem;"> False
        </label>
      </div>
    </div>
  `;
  container.appendChild(booleanOptions);
  
  // --- Regex Help Section (for strings) ---
  const regexHelp = document.createElement('div');
  regexHelp.id = 'searchRegexHelp';
  regexHelp.style.marginTop = '0.5rem';
  regexHelp.style.padding = '0.5rem';
  regexHelp.style.background = '#252525';
  regexHelp.style.border = '1px solid #404040';
  regexHelp.style.borderRadius = '0.25rem';
  regexHelp.style.fontSize = '0.65rem';
  regexHelp.innerHTML = `
    <div style="font-weight: bold; color: #9ca3af; margin-bottom: 0.25rem;">RegEx Pattern Examples:</div>
    <div style="font-family: monospace; color: #d1d5db; display: grid; grid-template-columns: auto 1fr; gap: 0.15rem 0.5rem;">
      <span style="color: #10b981;">Concrete</span><span>Contains "Concrete"</span>
      <span style="color: #10b981;">^Concrete</span><span>Starts with "Concrete"</span>
      <span style="color: #10b981;">Steel$</span><span>Ends with "Steel"</span>
      <span style="color: #10b981;">Concrete|Steel</span><span>"Concrete" OR "Steel"</span>
    </div>
  `;
  container.appendChild(regexHelp);
  
  // Function to update UI based on detected property type
  const updateSearchOptionsForType = () => {
    const categoryInput = inputForm.querySelector(`#${categoryInputId}`);
    const propertyInput = inputForm.querySelector(`#${propertyInputId}`);
    
    if (!categoryInput || !propertyInput) return;
    
    const category = categoryInput.value;
    const propName = propertyInput.value;
    
    if (category && propName) {
      const propInfo = getPropertyInfo(category, propName);
      if (propInfo) {
        const isNumeric = DataTypes.isNumeric(propInfo);
        const isBoolean = DataTypes.isBoolean(propInfo);
        
        typeIndicator.textContent = `Property type: ${DataTypes.getName(propInfo)}`;
        typeIndicator.style.color = '#10b981';
        
        if (isBoolean) {
          currentType = 'boolean';
          stringOptions.style.display = 'none';
          numericOptions.style.display = 'none';
          booleanOptions.style.display = 'block';
          valueInput.style.display = 'none';
          valueLabel.style.display = 'none';
          regexHelp.style.display = 'none';
        } else if (isNumeric) {
          currentType = 'numeric';
          stringOptions.style.display = 'none';
          numericOptions.style.display = 'block';
          booleanOptions.style.display = 'none';
          valueInput.style.display = 'block';
          valueLabel.style.display = 'block';
          valueInput.placeholder = 'e.g., 100 or 3.14';
          valueInput.type = 'number';
          valueInput.step = propInfo.dataType === 2 ? '1' : 'any';
          regexHelp.style.display = 'none';
        } else {
          currentType = 'string';
          stringOptions.style.display = 'block';
          numericOptions.style.display = 'none';
          booleanOptions.style.display = 'none';
          valueInput.style.display = 'block';
          valueLabel.style.display = 'block';
          valueInput.placeholder = 'e.g., Basic Wall or ^Concrete';
          valueInput.type = 'text';
          regexHelp.style.display = 'block';
        }
        return;
      }
    }
    
    // Default to string if property not found
    typeIndicator.textContent = 'Property type: String (default)';
    typeIndicator.style.color = '#6b7280';
    currentType = 'string';
    stringOptions.style.display = 'block';
    numericOptions.style.display = 'none';
    booleanOptions.style.display = 'none';
    valueInput.style.display = 'block';
    valueLabel.style.display = 'block';
    valueInput.placeholder = 'e.g., Basic Wall or ^Concrete';
    valueInput.type = 'text';
    regexHelp.style.display = 'block';
  };
  
  // Listen for changes on category and property inputs
  inputForm.addEventListener('change', (event) => {
    if (event.target.id === categoryInputId || event.target.id === propertyInputId) {
      updateSearchOptionsForType();
    }
  });
  
  // Initial update
  setTimeout(updateSearchOptionsForType, 50);
  
  return {
    container,
    getValue: () => valueInput.value,
    getCurrentType: () => currentType,
    getSearchOptions: () => {
      if (currentType === 'boolean') {
        const boolVal = container.querySelector('input[name="searchBooleanVal"]:checked')?.value;
        return {
          dataType: 'boolean',
          value: boolVal === 'true'
        };
      } else if (currentType === 'numeric') {
        const operator = container.querySelector('input[name="searchNumericOp"]:checked')?.value || '=';
        return {
          dataType: 'numeric',
          operator: operator,
          value: parseFloat(valueInput.value)
        };
      } else {
        const matchType = container.querySelector('input[name="searchMatchType"]:checked')?.value || 'partial';
        const caseInsensitive = container.querySelector('#searchCaseInsensitive')?.checked || false;
        return {
          dataType: 'string',
          matchType: matchType,
          caseInsensitive: caseInsensitive,
          value: valueInput.value
        };
      }
    },
    validate: () => {
      if (currentType === 'boolean') {
        return { valid: true };
      } else if (currentType === 'numeric') {
        const val = parseFloat(valueInput.value);
        if (isNaN(val)) {
          return { valid: false, error: 'Please enter a valid number.' };
        }
        return { valid: true };
      } else {
        if (!valueInput.value.trim()) {
          return { valid: false, error: 'Please enter a search value.' };
        }
        return { valid: true };
      }
    }
  };
}

/**
 * Create a type-aware value input that adapts based on the selected property's dataType
 * 
 * @param {HTMLElement} inputForm - The parent form element
 * @param {string} categoryInputId - ID of the category input element
 * @param {string} propertyInputId - ID of the property input element
 * @returns {Object} Object with { container, getValue, validate }
 */
function createTypeAwareValueInput(inputForm, categoryInputId, propertyInputId) {
  const container = document.createElement('div');
  container.id = 'propValContainer';
  container.style.marginTop = '0.5rem';
  
  const label = document.createElement('label');
  label.textContent = 'Property Value';
  label.style.display = 'block';
  label.style.marginBottom = '0.25rem';
  
  const inputWrapper = document.createElement('div');
  inputWrapper.id = 'propValInputWrapper';
  
  // Start with a text input
  let currentInput = document.createElement('input');
  currentInput.type = 'text';
  currentInput.id = 'propVal';
  currentInput.placeholder = 'Select a property first...';
  currentInput.className = 'w-full text-xs';
  inputWrapper.appendChild(currentInput);
  
  // Type indicator
  const typeIndicator = document.createElement('div');
  typeIndicator.id = 'propValTypeIndicator';
  typeIndicator.style.fontSize = '0.65rem';
  typeIndicator.style.color = '#6b7280';
  typeIndicator.style.marginTop = '0.25rem';
  typeIndicator.textContent = '';
  
  container.appendChild(label);
  container.appendChild(inputWrapper);
  container.appendChild(typeIndicator);
  
  // Function to update the input based on property type
  const updateInputForProperty = () => {
    const categoryInput = inputForm.querySelector(`#${categoryInputId}`);
    const propertyInput = inputForm.querySelector(`#${propertyInputId}`);
    
    if (!categoryInput || !propertyInput) return;
    
    const category = categoryInput.value;
    const propName = propertyInput.value;
    
    if (!category || !propName) {
      typeIndicator.textContent = '';
      return;
    }
    
    const propInfo = getPropertyInfo(category, propName);
    currentInput = renderTypeAwareInput(propInfo, inputWrapper, typeIndicator);
  };
  
  // Set up event listeners using event delegation on the form
  // This ensures we catch events even if the select elements are rebuilt
  inputForm.addEventListener('change', (event) => {
    const targetId = event.target.id;
    if (targetId === categoryInputId || targetId === propertyInputId) {
      updateInputForProperty();
    }
  });
  
  // Initial update after a brief delay to ensure all elements are ready
  setTimeout(() => {
    updateInputForProperty();
  }, 50);
  
  return {
    container,
    getValue: () => {
      const input = inputWrapper.querySelector('#propVal');
      return input ? input.value : '';
    },
    validate: () => {
      const categoryInput = inputForm.querySelector(`#${categoryInputId}`);
      const propertyInput = inputForm.querySelector(`#${propertyInputId}`);
      const input = inputWrapper.querySelector('#propVal');
      
      if (!categoryInput?.value || !propertyInput?.value) {
        return { valid: false, error: 'Please select a category and property first.' };
      }
      
      const propInfo = getPropertyInfo(categoryInput.value, propertyInput.value);
      const value = input?.value;
      
      if (!value && value !== '0' && value !== 'false') {
        return { valid: false, error: 'Please enter a value.' };
      }
      
      // Use full propInfo object for type checking (handles unit-based types)
      if (propInfo && DataTypes.isNumeric(propInfo)) {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return { valid: false, error: `Please enter a valid number for this ${DataTypes.getName(propInfo)} property.` };
        }
        if (propInfo.dataType === 2 && !Number.isInteger(numValue)) {
          return { valid: false, error: 'Please enter a whole number (integer) for this property.' };
        }
      }
      
      return { valid: true };
    }
  };
}

/**
 * Create a type-aware value input that adapts based on a qualified property ID
 * Watches a text input for the qualified prop and updates the value input type accordingly.
 * 
 * @param {HTMLElement} inputForm - The parent form element
 * @param {string} qualPropInputId - ID of the qualified property text input element
 * @returns {Object} Object with { container, getValue, validate }
 */
function createTypeAwareValueInputByQualifiedProp(inputForm, qualPropInputId) {
  const container = document.createElement('div');
  container.id = 'propValContainer';
  container.style.marginTop = '0.5rem';
  
  const label = document.createElement('label');
  label.textContent = 'Property Value';
  label.style.display = 'block';
  label.style.marginBottom = '0.25rem';
  
  const inputWrapper = document.createElement('div');
  inputWrapper.id = 'propValInputWrapper';
  
  // Start with a text input
  let currentInput = document.createElement('input');
  currentInput.type = 'text';
  currentInput.id = 'propVal';
  currentInput.placeholder = 'Enter qualified prop ID first...';
  currentInput.className = 'w-full text-xs';
  inputWrapper.appendChild(currentInput);
  
  // Type indicator
  const typeIndicator = document.createElement('div');
  typeIndicator.id = 'propValTypeIndicator';
  typeIndicator.style.fontSize = '0.65rem';
  typeIndicator.style.color = '#6b7280';
  typeIndicator.style.marginTop = '0.25rem';
  typeIndicator.textContent = '';
  
  container.appendChild(label);
  container.appendChild(inputWrapper);
  container.appendChild(typeIndicator);
  
  // Function to update the input based on property type
  const updateInputForQualifiedProp = () => {
    const qualPropInput = inputForm.querySelector(`#${qualPropInputId}`);
    
    if (!qualPropInput) return;
    
    const qualPropId = qualPropInput.value.trim();
    
    if (!qualPropId) {
      typeIndicator.textContent = '';
      return;
    }
    
    const propInfo = getPropertyInfoByQualifiedId(qualPropId);
    currentInput = renderTypeAwareInput(propInfo, inputWrapper, typeIndicator);
  };
  
  // Watch for changes on the qualified prop input (blur and input events)
  inputForm.addEventListener('blur', (event) => {
    if (event.target.id === qualPropInputId) {
      updateInputForQualifiedProp();
    }
  }, true); // Use capture to catch blur
  
  inputForm.addEventListener('input', (event) => {
    if (event.target.id === qualPropInputId) {
      // Debounce - only update after user stops typing
      clearTimeout(inputForm._qualPropDebounce);
      inputForm._qualPropDebounce = setTimeout(updateInputForQualifiedProp, 300);
    }
  });
  
  // Initial update after a brief delay
  setTimeout(() => {
    updateInputForQualifiedProp();
  }, 50);
  
  return {
    container,
    getValue: () => {
      const input = inputWrapper.querySelector('#propVal');
      return input ? input.value : '';
    },
    validate: () => {
      const qualPropInput = inputForm.querySelector(`#${qualPropInputId}`);
      const input = inputWrapper.querySelector('#propVal');
      
      if (!qualPropInput?.value) {
        return { valid: false, error: 'Please enter a qualified property ID first.' };
      }
      
      const propInfo = getPropertyInfoByQualifiedId(qualPropInput.value.trim());
      const value = input?.value;
      
      if (!value && value !== '0' && value !== 'false') {
        return { valid: false, error: 'Please enter a value.' };
      }
      
      // Type validation
      if (propInfo && DataTypes.isNumeric(propInfo)) {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return { valid: false, error: `Please enter a valid number for this ${DataTypes.getName(propInfo)} property.` };
        }
        if (propInfo.dataType === 2 && !Number.isInteger(numValue)) {
          return { valid: false, error: 'Please enter a whole number (integer) for this property.' };
        }
      }
      
      return { valid: true };
    }
  };
}

/**
 * Main function to render all STUB sections
 * 
 * This is called when a facility is selected. It renders all available
 * STUB functions organized by category in dropdown menus.
 * 
 * @param {HTMLElement} container - DOM container for stubs
 * @param {string} facilityURN - Current facility URN
 * @param {string} region - Current region
 */
export async function renderStubs(container, facilityURN, region) {
  // Store context
  currentFacilityURN = facilityURN;
  currentFacilityRegion = region;
  
  // Load models for this facility (needed for model selector)
  currentModels = await getModels(facilityURN, region) || [];
  
  container.innerHTML = '';
  
  // Create Facility Stubs Dropdown
  const facilityDropdown = createDropdownMenu('Facility Stubs', [
    {
      label: 'GET Facility Info',
      action: () => facilityStubs.getFacilityInfo(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET Facility Template',
      action: () => facilityStubs.getFacilityTemplate(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET Facility Inline Template',
      action: () => facilityStubs.getInlineTemplate(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET Facility Subjects',
      action: () => facilityStubs.getSubjects(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET User Access Levels (all)',
      action: () => facilityStubs.getFacilityUsers(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET User Access Level (by ID)',
      hasInput: true,
      inputConfig: {
        type: 'text',
        label: 'User ID',
        placeholder: 'Enter User ID (e.g., from GET Facility Subjects)',
        defaultValue: '',
        onExecute: (userID) => facilityStubs.getFacilityUserAccessLevel(currentFacilityURN, currentFacilityRegion, userID)
      }
    },
    {
      label: 'GET Facility Thumbnail',
      action: () => facilityStubs.getThumbnail(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET Saved Views',
      action: () => facilityStubs.getSavedViews(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET Saved View (by UUID)',
      hasInput: true,
      inputConfig: {
        type: 'text',
        label: 'View UUID',
        placeholder: 'Enter View UUID (from GET Saved Views)',
        defaultValue: '',
        onExecute: (viewUUID) => facilityStubs.getSavedViewByUUID(currentFacilityURN, currentFacilityRegion, viewUUID)
      }
    },
    {
      label: 'GET Saved View Thumbnail',
      hasInput: true,
      inputConfig: {
        type: 'text',
        label: 'View UUID',
        placeholder: 'Enter View UUID (from GET Saved Views)',
        defaultValue: '',
        onExecute: (viewUUID) => facilityStubs.getSavedViewThumbnail(currentFacilityURN, currentFacilityRegion, viewUUID)
      }
    }
  ]);
  
  container.appendChild(facilityDropdown);
  
  // Create Model Stubs Dropdown
  const modelDropdown = createDropdownMenu('Model Stubs', [
    {
      label: 'GET Model Properties',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        onExecute: (modelUrn) => modelStubs.getModelProperties(modelUrn, currentFacilityRegion)
      }
    },
    {
      label: 'GET Model',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        onExecute: (modelUrn) => modelStubs.getModel(modelUrn, currentFacilityRegion)
      }
    },
    {
      label: 'GET AEC Model Data',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        onExecute: (modelUrn) => modelStubs.getAECModelData(modelUrn, currentFacilityRegion)
      }
    },
    {
      label: 'GET Model Data Attributes',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        onExecute: (modelUrn) => modelStubs.getModelDataAttrs(modelUrn, currentFacilityRegion)
      }
    },
    {
      label: 'GET Model Data Schema',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        onExecute: (modelUrn) => modelStubs.getModelDataSchema(modelUrn, currentFacilityRegion)
      }
    },
    {
      label: 'GET Model Data Fragments',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        additionalFields: [
          {
            label: 'Element Keys (comma-separated, optional)',
            id: 'elemKeys',
            type: 'text',
            placeholder: 'Leave empty for entire model',
            defaultValue: ''
          }
        ],
        onExecute: (modelUrn, additionalValues) => modelStubs.getModelDataFragments(modelUrn, currentFacilityRegion, additionalValues.elemKeys || '')
      }
    }
  ]);
  
  container.appendChild(modelDropdown);
  
  // Create Property Stubs Dropdown
  const propertyDropdown = createDropdownMenu('Property Stubs', [
    {
      label: 'GET Qualified Property',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Category Name',
            id: 'categoryName',
            type: 'text',
            placeholder: 'e.g., Identity Data, Dimensions',
            defaultValue: () => getLastInputValue('categoryName', 'Identity Data'),
            autocomplete: 'category'
          },
          {
            label: 'Property Name',
            id: 'propName',
            type: 'text',
            placeholder: 'e.g., Mark, Comments',
            defaultValue: () => getLastInputValue('propName', 'Mark'),
            autocomplete: 'property'
          }
        ],
        onExecute: (values) => {
          saveInputValue('categoryName', values.categoryName);
          saveInputValue('propName', values.propName);
          return propertyStubs.getQualifiedProperty(currentFacilityURN, currentFacilityRegion, values.categoryName, values.propName);
        }
      }
    },
    {
      label: 'SCAN for Property',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Category Name',
            id: 'categoryName',
            type: 'text',
            placeholder: 'e.g., Identity Data, Dimensions',
            defaultValue: () => getLastInputValue('categoryName', 'Identity Data'),
            autocomplete: 'category'
          },
          {
            label: 'Property Name',
            id: 'propName',
            type: 'text',
            placeholder: 'e.g., Mark, Comments',
            defaultValue: () => getLastInputValue('propName', 'Mark'),
            autocomplete: 'property'
          },
          {
            label: 'Include History',
            id: 'includeHistory',
            type: 'checkbox',
            defaultValue: false
          }
        ],
        onExecute: (values) => {
          saveInputValue('categoryName', values.categoryName);
          saveInputValue('propName', values.propName);
          return propertyStubs.scanForProperty(currentFacilityURN, currentFacilityRegion, values.categoryName, values.propName, values.includeHistory);
        }
      }
    },
    {
      label: 'SCAN for User Props',
      action: () => propertyStubs.scanForUserProps(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'Find Elements where Property = X',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Category Name',
            id: 'categoryName',
            type: 'text',
            placeholder: 'e.g., Identity Data, Dimensions',
            defaultValue: () => getLastInputValue('categoryName', 'Identity Data'),
            autocomplete: 'category'
          },
          {
            label: 'Property Name',
            id: 'propName',
            type: 'text',
            placeholder: 'e.g., Mark, Comments',
            defaultValue: () => getLastInputValue('propName', 'Mark'),
            autocomplete: 'property'
          },
          {
            id: 'searchOptions',
            type: 'typeAwareSearch',
            categoryInputId: 'categoryName',
            propertyInputId: 'propName'
          }
        ],
        onExecute: (values) => {
          saveInputValue('categoryName', values.categoryName);
          saveInputValue('propName', values.propName);
          return propertyStubs.findElementsWherePropValueEquals(
            currentFacilityURN, 
            currentFacilityRegion, 
            values.categoryName, 
            values.propName, 
            values.searchOptions
          );
        }
      }
    },
    {
      label: 'SCAN Brute Force (full model)',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        onExecute: (modelUrn) => propertyStubs.getScanBruteForce(modelUrn, currentFacilityRegion)
      }
    },
    {
      label: 'SCAN with Options',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        additionalFields: [
          {
            label: 'Element Keys (comma-separated, optional)',
            id: 'elemKeys',
            type: 'text',
            placeholder: 'Leave empty for entire model',
            defaultValue: ''
          },
          {
            label: 'Column Families',
            id: 'colFamilies',
            type: 'checklist',
            options: [
              { value: 'n', label: 'n - Standard (name, flags, etc.)' },
              { value: 'z', label: 'z - DtProperties (user-defined)' },
              { value: 'l', label: 'l - Refs (same-model references)' },
              { value: 'x', label: 'x - XRefs (cross-model references)' },
              { value: 'm', label: 'm - Source (original model data)' },
              { value: 's', label: 's - Systems' }
            ],
            defaultValue: ['n']
          },
          {
            label: 'Include History',
            id: 'includeHistory',
            type: 'checkbox',
            defaultValue: false
          }
        ],
        onExecute: (modelUrn, additionalValues) => {
          const elemKeys = additionalValues.elemKeys || '';
          const colFamilies = additionalValues.colFamilies || '';
          const includeHistory = additionalValues.includeHistory || false;
          return propertyStubs.getScanElementsOptions(modelUrn, currentFacilityRegion, elemKeys, includeHistory, colFamilies);
        }
      }
    },
    {
      label: 'SCAN with Qualified Props',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        additionalFields: [
          {
            label: 'Element Keys (comma-separated, optional)',
            id: 'elemKeys',
            type: 'text',
            placeholder: 'Leave empty for entire model',
            defaultValue: ''
          },
          {
            label: 'Qualified Properties (comma-separated)',
            id: 'qualProps',
            type: 'text',
            placeholder: 'e.g., z:5mQ,n:n (from GET Schema)',
            defaultValue: 'n:n'
          },
          {
            label: 'Include History',
            id: 'includeHistory',
            type: 'checkbox',
            defaultValue: false
          }
        ],
        onExecute: (modelUrn, additionalValues) => 
          propertyStubs.getScanElementsQualProps(modelUrn, currentFacilityRegion, additionalValues.elemKeys || '', additionalValues.includeHistory || false, additionalValues.qualProps || '')
      }
    },
    {
      label: 'SCAN Full Change History',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        additionalFields: [
          {
            label: 'Element Keys (comma-separated, required)',
            id: 'elemKeys',
            type: 'text',
            placeholder: 'Element keys are required',
            defaultValue: ''
          }
        ],
        onExecute: (modelUrn, additionalValues) => propertyStubs.getScanElementsFullChangeHistory(modelUrn, currentFacilityRegion, additionalValues.elemKeys || '')
      }
    },
    {
      label: 'Assign Classification',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        additionalFields: [
          {
            label: 'Classification String',
            id: 'classificationStr',
            type: 'text',
            placeholder: 'e.g., Walls > Curtain Wall',
            defaultValue: ''
          },
          {
            label: 'Element Keys (comma-separated)',
            id: 'elemKeys',
            type: 'text',
            placeholder: 'Keys of elements to update',
            defaultValue: ''
          }
        ],
        onExecute: (modelUrn, additionalValues) => 
          propertyStubs.assignClassification(currentFacilityURN, currentFacilityRegion, additionalValues.classificationStr || '', modelUrn, additionalValues.elemKeys || '')
      }
    },
    {
      label: 'SET Property (by Category/Name)',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        additionalFields: [
          {
            label: 'Category Name',
            id: 'propCategory',
            type: 'text',
            placeholder: 'e.g., Identity Data',
            defaultValue: () => getLastInputValue('categoryName', 'Identity Data'),
            autocomplete: 'category'
          },
          {
            label: 'Property Name',
            id: 'propName',
            type: 'text',
            placeholder: 'e.g., Mark',
            defaultValue: () => getLastInputValue('propName', 'Mark'),
            autocomplete: 'property'
          },
          {
            id: 'propVal',
            type: 'typeAwareValue',
            categoryInputId: 'propCategory',
            propertyInputId: 'propName'
          },
          {
            label: 'Element Keys (comma-separated)',
            id: 'elemKeys',
            type: 'text',
            placeholder: 'Keys of elements to update',
            defaultValue: ''
          }
        ],
        onExecute: (modelUrn, additionalValues) => 
          propertyStubs.setPropertySelSet(modelUrn, currentFacilityRegion, additionalValues.propCategory || '', additionalValues.propName || '', additionalValues.propVal || '', additionalValues.elemKeys || '')
      }
    },
    {
      label: 'SET Property (by Qualified Prop)',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        additionalFields: [
          {
            label: 'Qualified Property ID',
            id: 'qualPropStr',
            type: 'text',
            placeholder: 'e.g., z:5mQ (from GET Schema)',
            defaultValue: ''
          },
          {
            id: 'propVal',
            type: 'typeAwareValueByQualifiedProp',
            qualPropInputId: 'qualPropStr'
          },
          {
            label: 'Element Keys (comma-separated)',
            id: 'elemKeys',
            type: 'text',
            placeholder: 'Keys of elements to update',
            defaultValue: ''
          }
        ],
        onExecute: (modelUrn, additionalValues) => 
          propertyStubs.setPropertySelSetQP(modelUrn, currentFacilityRegion, additionalValues.qualPropStr || '', additionalValues.propVal || '', additionalValues.elemKeys || '')
      }
    },
    {
      label: 'DELETE Property Value(s)',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        additionalFields: [
          {
            label: 'Element Keys (comma-separated)',
            id: 'elemKeys',
            type: 'text',
            placeholder: 'Keys of elements to update'
          },
          {
            label: 'Qualified Property Name(s) (comma-separated)',
            id: 'qualPropNames',
            type: 'text',
            placeholder: 'e.g., z:4wc  or  z:4wc, z:z:4wc  (to clean up double-prefix corruption)'
          }
        ],
        onExecute: (modelUrn, additionalValues) =>
          propertyStubs.deletePropertyValue(currentFacilityURN, currentFacilityRegion, modelUrn, additionalValues.elemKeys || '', additionalValues.qualPropNames || '')
      }
    }
  ]);
  
  container.appendChild(propertyDropdown);
  
  // Create Group Stubs Dropdown
  const groupDropdown = createDropdownMenu('Group Stubs', [
    {
      label: 'GET Groups (All)',
      hasInput: false,
      action: () => groupStubs.getGroups().then(groups => {
        // Store in explicit cache (overrides app's cached groups)
        explicitGroupsCache = groups || [];
      })
    },
    {
      label: 'GET Group (by URN)',
      hasInput: true,
      inputConfig: {
        type: 'groupSelect',
        label: 'Group',
        onExecute: (groupUrn) => groupStubs.getGroup(groupUrn)
      }
    },
    {
      label: 'GET Group Metrics',
      hasInput: true,
      inputConfig: {
        type: 'groupSelect',
        label: 'Group',
        onExecute: (groupUrn) => groupStubs.getGroupMetrics(groupUrn)
      }
    },
    {
      label: 'GET Facilities for Group',
      hasInput: true,
      inputConfig: {
        type: 'groupSelect',
        label: 'Group',
        onExecute: (groupUrn) => groupStubs.getFacilitiesForGroup(groupUrn)
      }
    }
  ]);
  
  container.appendChild(groupDropdown);
  
  // Create Stream Stubs Dropdown
  const streamDropdown = createDropdownMenu('Stream Stubs', [
    {
      label: 'GET Streams (from Default Model)',
      hasInput: false,
      action: () => streamStubs.getStreamsFromDefaultModel(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET Stream Values',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Key',
            id: 'streamKey',
            placeholder: 'Single stream key'
          },
          {
            label: 'Time Period',
            id: 'timePeriod',
            type: 'select',
            options: [
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: '365', label: '365 days' },
              { value: '0', label: 'All Time' }
            ],
            defaultValue: '30'
          }
        ],
        onExecute: (values) => {
          const days = parseInt(values.timePeriod, 10);
          return streamStubs.getStreamValues(currentFacilityURN, currentFacilityRegion, values.streamKey || '', days);
        }
      }
    },
    {
      label: 'GET Last Seen Stream Values',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Keys (comma-separated)',
            id: 'streamKeys',
            placeholder: 'e.g., ABC123,DEF456'
          }
        ],
        onExecute: (values) => 
          streamStubs.getLastSeenStreamValues(currentFacilityURN, currentFacilityRegion, values.streamKeys || '')
      }
    },
    {
      label: 'POST Stream Values',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Key',
            id: 'streamKey',
            placeholder: 'Single stream key'
          },
          {
            label: 'Values (JSON)',
            id: 'valuesJson',
            placeholder: '{"test_val1": 22.5, "test_val2": 33.0}',
            defaultValue: '{"test_val1": 22.5, "test_val2": 33.0}'
          }
        ],
        onExecute: (values) => 
          streamStubs.postStreamValues(currentFacilityURN, currentFacilityRegion, values.streamKey || '', values.valuesJson || '')
      }
    },
    {
      label: 'Create Stream',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Name',
            id: 'streamName',
            placeholder: 'e.g., Temperature Sensor 1'
          },
          {
            label: 'Host Model URN (optional)',
            id: 'hostModelURN',
            placeholder: 'Leave empty for no host'
          },
          {
            label: 'Host Element Key (optional)',
            id: 'hostKey',
            placeholder: 'Leave empty for no host'
          },
          {
            label: 'Classification (optional)',
            id: 'classification',
            placeholder: 'e.g., Walls > Curtain Wall'
          }
        ],
        onExecute: (values) => 
          streamStubs.createStream(
            currentFacilityURN, 
            currentFacilityRegion, 
            values.streamName || '',
            values.hostModelURN || '',
            values.hostKey || '',
            values.classification || ''
          )
      }
    },
    {
      label: 'Delete Streams',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Keys (comma-separated)',
            id: 'streamKeys',
            placeholder: 'e.g., ABC123,DEF456'
          }
        ],
        onExecute: (values) => 
          streamStubs.deleteStreams(currentFacilityURN, currentFacilityRegion, values.streamKeys || '')
      }
    },
    {
      label: 'Assign Host to Stream',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Key',
            id: 'streamKey',
            placeholder: 'Key of stream to modify'
          },
          {
            label: 'Host Model URN',
            id: 'hostModelURN',
            placeholder: 'Model containing the host element'
          },
          {
            label: 'Host Element Key',
            id: 'hostKey',
            placeholder: 'Element key of the host'
          }
        ],
        onExecute: (values) => 
          streamStubs.assignHostToStream(
            currentFacilityURN,
            currentFacilityRegion,
            values.streamKey || '',
            values.hostModelURN || '',
            values.hostKey || ''
          )
      }
    },
    {
      label: 'Remove Host from Stream',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Keys (comma-separated)',
            id: 'streamKeys',
            placeholder: 'e.g., ABC123,DEF456'
          }
        ],
        onExecute: (values) => 
          streamStubs.removeHostFromStream(currentFacilityURN, currentFacilityRegion, values.streamKeys || '')
      }
    },
    {
      label: 'GET Stream Secrets',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Keys (comma-separated)',
            id: 'streamKeys',
            placeholder: 'e.g., ABC123,DEF456'
          }
        ],
        onExecute: (values) => 
          streamStubs.getStreamSecrets(currentFacilityURN, currentFacilityRegion, values.streamKeys || '')
      }
    },
    {
      label: 'Reset Stream Secrets',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Keys (comma-separated)',
            id: 'streamKeys',
            placeholder: 'e.g., ABC123,DEF456'
          }
        ],
        onExecute: (values) => 
          streamStubs.resetStreamSecrets(currentFacilityURN, currentFacilityRegion, values.streamKeys || '')
      }
    },
    {
      label: 'GET Stream Configs',
      hasInput: false,
      action: () => streamStubs.getStreamConfigs(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET Stream Config',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Key',
            id: 'streamKey',
            placeholder: 'Single stream key'
          }
        ],
        onExecute: (values) =>
          streamStubs.getStreamConfig(currentFacilityURN, currentFacilityRegion, values.streamKey || '')
      }
    },
    {
      label: 'PUT Save Stream Config',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Key',
            id: 'streamKey',
            placeholder: 'Single stream key'
          },
          {
            label: 'Stream Settings (JSON)  —  tip: paste the GET response here, edit, then Execute',
            id: 'settingsJson',
            type: 'textarea',
            rows: 6,
            placeholder: '{\n  "elementId": "<from GET stream-configs>",\n  "streamSettings": {\n    "sourceMapping": { "<familyId:paramId>": { "path": "temperature", "ts": "ts" } },\n    "thresholds": { "<familyId:paramId>": { "lower": { "warn": 18, "alert": 15 }, "upper": { "warn": 23, "alert": 25 } } },\n    "offlineTimeout": 3600\n  }\n}'
          }
        ],
        onExecute: (values) =>
          streamStubs.saveStreamConfig(currentFacilityURN, currentFacilityRegion, values.streamKey || '', values.settingsJson || '{}')
      }
    },
    {
      label: 'PATCH Update Stream Configs',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Stream Configs (JSON array)  —  tip: paste the GET Stream Configs response here, edit, then Execute',
            id: 'configsJson',
            type: 'textarea',
            rows: 6,
            placeholder: '[\n  {\n    "elementId": "<from GET stream-configs>",\n    "streamSettings": {\n      "sourceMapping": { "<familyId:paramId>": { "path": "temperature", "ts": "ts" } },\n      "thresholds": { "<familyId:paramId>": { "lower": { "warn": 18, "alert": 15 }, "upper": { "warn": 23, "alert": 25 } } },\n      "offlineTimeout": 3600\n    }\n  }\n]'
          }
        ],
        onExecute: (values) =>
          streamStubs.updateStreamConfigs(currentFacilityURN, currentFacilityRegion, values.configsJson || '[]')
      }
    }
  ]);
  
  container.appendChild(streamDropdown);
  
  // Create Document Stubs Dropdown
  const documentDropdown = createDropdownMenu('Document Stubs', [
    {
      label: 'GET Documents',
      hasInput: false,
      action: () => documentStubs.getDocuments(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET Document Download Link',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Document ID',
            id: 'documentId',
            placeholder: 'e.g., abc123 (from GET Documents)'
          }
        ],
        onExecute: (values) => 
          documentStubs.getDocumentDownloadLink(currentFacilityURN, currentFacilityRegion, values.documentId || '')
      }
    },
    {
      label: 'Create Document Link',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'ACC Account ID',
            id: 'accAccountId',
            placeholder: 'ACC/BIM360 Account ID'
          },
          {
            label: 'ACC Project ID',
            id: 'accProjectId',
            placeholder: 'ACC/BIM360 Project ID'
          },
          {
            label: 'ACC Lineage (Item URN)',
            id: 'accLineage',
            placeholder: 'urn:adsk.wipprod:dm.lineage:...'
          },
          {
            label: 'ACC Version (Version URN)',
            id: 'accVersion',
            placeholder: 'urn:adsk.wipprod:fs.file:...'
          },
          {
            label: 'Document Name',
            id: 'docName',
            placeholder: 'Display name for the document'
          }
        ],
        onExecute: (values) => 
          documentStubs.createDocumentLink(
            currentFacilityURN, 
            currentFacilityRegion, 
            values.accAccountId || '',
            values.accProjectId || '',
            values.accLineage || '',
            values.accVersion || '',
            values.docName || ''
          )
      }
    },
    {
      label: 'Delete Documents',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'Document IDs (comma-separated)',
            id: 'documentIds',
            placeholder: 'e.g., abc123,def456'
          }
        ],
        onExecute: (values) => 
          documentStubs.deleteDocuments(currentFacilityURN, currentFacilityRegion, values.documentIds || '')
      }
    }
  ]);
  
  container.appendChild(documentDropdown);
  
  // Create Miscellaneous Stubs Dropdown
  const miscDropdown = createDropdownMenu('Miscellaneous Stubs', [
    {
      label: 'GET Health',
      hasInput: false,
      action: () => miscStubs.getHealth()
    },
    {
      label: 'GET Facilities for User',
      hasInput: true,
      inputConfig: {
        type: 'multiText',
        fields: [
          {
            label: 'User ID',
            id: 'userID',
            placeholder: 'e.g., @me or user ID from GET Facility Subjects'
          }
        ],
        onExecute: (values) => miscStubs.getFacilitiesForUser(values.userID || '@me')
      }
    }
  ]);
  
  container.appendChild(miscDropdown);
  
  // Create Tandem App Stubs Dropdown
  const appDropdown = createDropdownMenu('Tandem App Stubs', [
    {
      label: 'GET Preferences',
      hasInput: false,
      action: () => appStubs.getPreferences()
    },
    {
      label: 'GET Classifications',
      hasInput: true,
      inputConfig: {
        type: 'groupSelect',
        label: 'Group',
        onExecute: (groupUrn) => appStubs.getClassifications(groupUrn)
      }
    },
    {
      label: 'GET Classification (by UUID)',
      hasInput: true,
      inputConfig: {
        type: 'groupSelect',
        label: 'Group',
        additionalFields: [
          {
            label: 'Classification UUID',
            id: 'classifUUID',
            type: 'text',
            placeholder: 'UUID from GET Classifications',
            defaultValue: ''
          }
        ],
        onExecute: (groupUrn, additionalValues) => 
          appStubs.getClassificationByUUID(groupUrn, additionalValues.classifUUID || '')
      }
    },
    {
      label: 'GET Facility Templates',
      hasInput: true,
      inputConfig: {
        type: 'groupSelect',
        label: 'Group',
        onExecute: (groupUrn) => appStubs.getFacilityTemplates(groupUrn)
      }
    },
    {
      label: 'GET Facility Template (by UUID)',
      hasInput: true,
      inputConfig: {
        type: 'groupSelect',
        label: 'Group',
        additionalFields: [
          {
            label: 'Template UUID',
            id: 'templateUUID',
            type: 'text',
            placeholder: 'UUID from GET Facility Templates',
            defaultValue: ''
          }
        ],
        onExecute: (groupUrn, additionalValues) => 
          appStubs.getFacilityTemplateByUUID(groupUrn, additionalValues.templateUUID || '')
      }
    },
    {
      label: 'GET Parameters',
      hasInput: true,
      inputConfig: {
        type: 'groupSelect',
        label: 'Group',
        onExecute: (groupUrn) => appStubs.getParameters(groupUrn)
      }
    },
    {
      label: 'GET Parameter (by UUID)',
      hasInput: true,
      inputConfig: {
        type: 'groupSelect',
        label: 'Group',
        additionalFields: [
          {
            label: 'Parameter UUID',
            id: 'paramUUID',
            type: 'text',
            placeholder: 'UUID from GET Parameters',
            defaultValue: ''
          }
        ],
        onExecute: (groupUrn, additionalValues) => 
          appStubs.getParameterByUUID(groupUrn, additionalValues.paramUUID || '')
      }
    }
  ]);
  
  container.appendChild(appDropdown);
  
  // Create SDK Stubs Dropdown (higher-level functions)
  const sdkDropdown = createDropdownMenu('SDK Stubs (Higher Level)', [
    {
      label: 'GET Rooms and Spaces',
      hasInput: false,
      action: () => sdkStubs.getRoomsAndSpaces(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET Levels',
      hasInput: false,
      action: () => sdkStubs.getLevels(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'GET Element & Type Properties',
      hasInput: true,
      inputConfig: {
        type: 'modelSelect',
        label: 'Model',
        additionalFields: [
          {
            label: 'Element Key',
            id: 'elemKey',
            type: 'text',
            placeholder: 'Element key from a scan result',
            defaultValue: ''
          }
        ],
        onExecute: (modelUrn, additionalValues) =>
          sdkStubs.getElementAndTypeProperties(modelUrn, currentFacilityRegion, additionalValues.elemKey || '')
      }
    },
    {
      label: 'GET Facility Structure',
      hasInput: false,
      action: () => sdkStubs.getFacilityStructure(currentFacilityURN, currentFacilityRegion)
    },
    {
      label: 'Find Elements with Empty Parameters',
      hasInput: false,
      action: () => sdkStubs.findElementsWithEmptyParameters(currentFacilityURN, currentFacilityRegion)
    }
  ]);
  
  container.appendChild(sdkDropdown);
  
  // Add a help message at the bottom
  const helpDiv = document.createElement('div');
  helpDiv.className = 'mt-4 p-3 bg-dark-bg border border-dark-border rounded text-xs text-dark-text-secondary';
  helpDiv.innerHTML = `
    <strong class="text-dark-text">Developer Tips:</strong><br>
    • Open Chrome DevTools (F12) to see output<br>
    • Click dropdown menus to see available endpoints<br>
    • All responses logged to console with details<br>
    • Check Network tab for HTTP requests
  `;
  container.appendChild(helpDiv);
}

/**
 * Create a dropdown menu with STUB functions
 * 
 * @param {string} title - Dropdown title
 * @param {Array} items - Array of {label, action, hasInput, inputConfig} objects
 * @returns {HTMLElement} Dropdown menu element
 */
function createDropdownMenu(title, items) {
  const dropdown = document.createElement('div');
  dropdown.className = 'dropdown-menu';
  
  // Create toggle button
  const toggle = document.createElement('button');
  toggle.className = 'dropdown-toggle';
  toggle.innerHTML = `
    <span>${title}</span>
    <svg class="dropdown-toggle-icon w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
    </svg>
  `;
  
  // Create dropdown content
  const content = document.createElement('div');
  content.className = 'dropdown-content';
  
  // Add items
  items.forEach((item, index) => {
    const itemContainer = document.createElement('div');
    
    const button = document.createElement('button');
    button.className = 'dropdown-item';
    button.textContent = item.label;
    
    // If item needs input, create expandable form
    if (item.hasInput && item.inputConfig) {
      const formId = `input-form-${Date.now()}-${index}`;
      const inputForm = document.createElement('div');
      inputForm.id = formId;
      inputForm.className = 'stub-input-form hidden';
      inputForm.style.margin = '0.375rem';
      inputForm.style.marginTop = '0';
      
      let mainInput;
      const additionalInputs = [];
      
      // Handle different input types
      if (item.inputConfig.type === 'multiText') {
        // Multiple fields (text inputs and/or checkboxes)
        item.inputConfig.fields.forEach((field, fieldIdx) => {
          const fieldType = field.type || 'text';
          
          if (fieldType === 'checkbox') {
            // Checkbox field - create a container with label and checkbox
            const checkboxContainer = document.createElement('div');
            checkboxContainer.style.marginTop = fieldIdx > 0 ? '0.5rem' : '0';
            checkboxContainer.style.display = 'flex';
            checkboxContainer.style.alignItems = 'center';
            checkboxContainer.style.gap = '0.5rem';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = field.id;
            checkbox.checked = field.defaultValue || false;
            checkbox.style.width = 'auto';
            checkbox.style.cursor = 'pointer';
            
            const label = document.createElement('label');
            label.textContent = field.label;
            label.htmlFor = field.id;
            label.style.margin = '0';
            label.style.cursor = 'pointer';
            label.style.fontSize = '0.75rem';
            
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            inputForm.appendChild(checkboxContainer);
            
            additionalInputs.push(checkbox);
          } else if (fieldType === 'typeAwareSearch') {
            // Type-aware search input with matching options
            const typeAwareSearch = createTypeAwareSearchInput(
              inputForm, 
              field.categoryInputId || 'categoryName', 
              field.propertyInputId || 'propName'
            );
            inputForm.appendChild(typeAwareSearch.container);
            // Store reference with special marker for value extraction
            additionalInputs.push({ isTypeAwareSearch: true, ref: typeAwareSearch, fieldId: field.id });
            
          } else if (fieldType === 'select') {
            // Select dropdown with predefined options
            const label = document.createElement('label');
            label.textContent = field.label;
            if (fieldIdx > 0) label.style.marginTop = '0.5rem';
            
            const select = document.createElement('select');
            select.id = field.id;
            select.className = 'w-full text-xs';
            
            field.options.forEach(opt => {
              const option = document.createElement('option');
              option.value = opt.value;
              option.textContent = opt.label;
              if (opt.value === field.defaultValue) {
                option.selected = true;
              }
              select.appendChild(option);
            });
            
            inputForm.appendChild(label);
            inputForm.appendChild(select);
            
            if (fieldIdx === 0) {
              mainInput = select;
            } else {
              additionalInputs.push(select);
            }
          } else if (fieldType === 'textarea') {
            // Multiline textarea for JSON or long values
            const label = document.createElement('label');
            label.textContent = field.label;
            if (fieldIdx > 0) label.style.marginTop = '0.5rem';

            const textarea = document.createElement('textarea');
            textarea.id = field.id;
            textarea.placeholder = field.placeholder || '';
            textarea.value = typeof field.defaultValue === 'function'
              ? field.defaultValue()
              : (field.defaultValue || '');
            textarea.rows = field.rows || 4;

            inputForm.appendChild(label);
            inputForm.appendChild(textarea);

            if (fieldIdx === 0) {
              mainInput = textarea;
            } else {
              additionalInputs.push(textarea);
            }
          } else {
            // Text input field (or select for autocomplete)
            const label = document.createElement('label');
            label.textContent = field.label;
            if (fieldIdx > 0) label.style.marginTop = '0.5rem';
            
            let input;
            
            // Use select dropdown for autocomplete if schemas are loaded
            if (field.autocomplete && areSchemasLoaded()) {
              input = createAutocompleteSelect(field, inputForm);
            } else {
              // Regular text input (fallback when schemas not loaded)
              input = document.createElement('input');
              input.type = 'text';
              input.id = field.id;
              input.placeholder = field.placeholder || '';
              input.value = typeof field.defaultValue === 'function' 
                ? field.defaultValue() 
                : (field.defaultValue || '');
              input.className = 'w-full text-xs';
            }
            
            inputForm.appendChild(label);
            inputForm.appendChild(input);
            
            if (fieldIdx === 0) {
              mainInput = input; // First field is "main"
            } else {
              additionalInputs.push(input);
            }
          }
        });
      } else {
        // Single field (model selector or text input)
        const mainLabel = document.createElement('label');
        mainLabel.textContent = item.inputConfig.label;
        
        if (item.inputConfig.type === 'modelSelect') {
          // Create a dropdown for model selection
          mainInput = document.createElement('select');
          mainInput.className = 'w-full text-xs';
          
          // Populate with models (in API order)
          const defaultModelURN = getDefaultModelURN(currentFacilityURN);
          currentModels.forEach((model, index) => {
            const option = document.createElement('option');
            option.value = model.modelId;
            
            const isDefault = model.modelId === defaultModelURN;
            const displayName = model.label || (isDefault ? '** Default Model **' : 'Untitled Model');
            
            // Show both name and URN for developer visibility
            option.textContent = `${displayName} - ${model.modelId}`;
            
            // Pre-select the first model in the list
            if (index === 0) {
              option.selected = true;
            }
            
            mainInput.appendChild(option);
          });
        } else if (item.inputConfig.type === 'groupSelect') {
          // Create a dropdown for group selection
          mainInput = document.createElement('select');
          mainInput.className = 'w-full text-xs';
          
          const groups = getGroupsForDropdown();
          if (groups.length === 0) {
            // No groups available
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- No groups available --';
            mainInput.appendChild(option);
          } else {
            // Determine which group to pre-select:
            // 1. Current account/group from header dropdown
            // 2. Last used group (from sessionStorage)
            // 3. First group in list
            const currentGroupURN = getCurrentGroupURN();
            const lastGroupURN = sessionStorage.getItem('tandem-testbed-lastGroupURN');
            const defaultGroupURN = currentGroupURN || lastGroupURN || (groups[0]?.urn);
            
            // Populate with groups
            groups.forEach((group) => {
              const option = document.createElement('option');
              option.value = group.urn;
              
              // Show both name and URN for developer visibility
              const displayName = group.name || 'Unnamed Group';
              option.textContent = `${displayName} - ${group.urn}`;
              
              // Pre-select matching group
              if (group.urn === defaultGroupURN) {
                option.selected = true;
              }
              
              mainInput.appendChild(option);
            });
            
            // Save selection on change
            mainInput.addEventListener('change', () => {
              sessionStorage.setItem('tandem-testbed-lastGroupURN', mainInput.value);
            });
          }
        } else {
          // Regular text input
          mainInput = document.createElement('input');
          mainInput.type = 'text';
          mainInput.placeholder = item.inputConfig.placeholder;
          mainInput.value = typeof item.inputConfig.defaultValue === 'function' 
            ? item.inputConfig.defaultValue() 
            : item.inputConfig.defaultValue;
          mainInput.className = 'w-full text-xs';
        }
        
        inputForm.appendChild(mainLabel);
        inputForm.appendChild(mainInput);
        
        // Additional fields if specified
        if (item.inputConfig.additionalFields) {
          item.inputConfig.additionalFields.forEach(field => {
            const fieldType = field.type || 'text';
            
            if (fieldType === 'checkbox') {
              // Checkbox field
              const checkboxContainer = document.createElement('div');
              checkboxContainer.style.marginTop = '0.5rem';
              checkboxContainer.style.display = 'flex';
              checkboxContainer.style.alignItems = 'center';
              checkboxContainer.style.gap = '0.5rem';
              
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.id = field.id;
              checkbox.checked = field.defaultValue || false;
              checkbox.style.width = 'auto';
              checkbox.style.cursor = 'pointer';
              
              const label = document.createElement('label');
              label.textContent = field.label;
              label.htmlFor = field.id;
              label.style.margin = '0';
              label.style.cursor = 'pointer';
              label.style.fontSize = '0.75rem';
              
              checkboxContainer.appendChild(checkbox);
              checkboxContainer.appendChild(label);
              inputForm.appendChild(checkboxContainer);
              additionalInputs.push(checkbox);
              
            } else if (fieldType === 'checklist') {
              // Checklist field (multiple checkboxes)
              const label = document.createElement('label');
              label.textContent = field.label;
              label.style.marginTop = '0.5rem';
              inputForm.appendChild(label);
              
              const checklistContainer = document.createElement('div');
              checklistContainer.id = field.id;
              checklistContainer.style.display = 'grid';
              checklistContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
              checklistContainer.style.gap = '0.25rem';
              checklistContainer.style.padding = '0.5rem';
              checklistContainer.style.background = '#2a2a2a';
              checklistContainer.style.borderRadius = '0.25rem';
              checklistContainer.style.marginTop = '0.25rem';
              
              field.options.forEach(opt => {
                const optContainer = document.createElement('div');
                optContainer.style.display = 'flex';
                optContainer.style.alignItems = 'center';
                optContainer.style.gap = '0.25rem';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = opt.value;
                checkbox.checked = field.defaultValue?.includes(opt.value) || false;
                checkbox.style.width = 'auto';
                checkbox.style.cursor = 'pointer';
                
                const optLabel = document.createElement('label');
                optLabel.textContent = opt.label;
                optLabel.style.margin = '0';
                optLabel.style.cursor = 'pointer';
                optLabel.style.fontSize = '0.7rem';
                optLabel.style.color = '#d1d5db';
                
                optContainer.appendChild(checkbox);
                optContainer.appendChild(optLabel);
                checklistContainer.appendChild(optContainer);
              });
              
              inputForm.appendChild(checklistContainer);
              additionalInputs.push(checklistContainer);
              
            } else if (fieldType === 'typeAwareValue') {
              // Type-aware value input that adapts based on property dataType (category/name lookup)
              const typeAwareInput = createTypeAwareValueInput(
                inputForm, 
                field.categoryInputId || 'propCategory', 
                field.propertyInputId || 'propName'
              );
              inputForm.appendChild(typeAwareInput.container);
              // Store the typeAwareInput object for validation and value retrieval
              additionalInputs.push(typeAwareInput);
              
            } else if (fieldType === 'typeAwareValueByQualifiedProp') {
              // Type-aware value input that adapts based on qualified property ID
              const typeAwareInput = createTypeAwareValueInputByQualifiedProp(
                inputForm, 
                field.qualPropInputId || 'qualPropStr'
              );
              inputForm.appendChild(typeAwareInput.container);
              // Store the typeAwareInput object for validation and value retrieval
              additionalInputs.push(typeAwareInput);
              
            } else {
              // Text input field (or select for autocomplete)
              const label = document.createElement('label');
              label.textContent = field.label;
              label.style.marginTop = '0.5rem';
              
              let input;
              
              // Use select dropdown for autocomplete if schemas are loaded
              if (field.autocomplete && areSchemasLoaded()) {
                input = createAutocompleteSelect(field, inputForm);
              } else {
                // Regular text input (fallback when schemas not loaded or no autocomplete)
                input = document.createElement('input');
                input.type = 'text';
                input.id = field.id;
                input.placeholder = field.placeholder || '';
                const defaultVal = typeof field.defaultValue === 'function' 
                  ? field.defaultValue() 
                  : (field.defaultValue || '');
                input.value = defaultVal;
                input.className = 'w-full text-xs';
              }
              
              inputForm.appendChild(label);
              inputForm.appendChild(input);
              additionalInputs.push(input);
            }
          });
        }
      }
      
      // Add regex help if specified
      if (item.inputConfig.showRegexHelp) {
        const helpSection = document.createElement('div');
        helpSection.style.marginTop = '0.75rem';
        helpSection.style.padding = '0.5rem';
        helpSection.style.background = '#2a2a2a';
        helpSection.style.borderRadius = '0.25rem';
        helpSection.style.fontSize = '0.65rem';
        helpSection.style.lineHeight = '1.3';
        
        const helpTitle = document.createElement('div');
        helpTitle.style.fontWeight = 'bold';
        helpTitle.style.marginBottom = '0.25rem';
        helpTitle.style.color = '#9ca3af';
        helpTitle.textContent = 'RegEx Pattern Examples:';
        
        const helpTable = document.createElement('div');
        helpTable.style.fontFamily = 'monospace';
        helpTable.style.color = '#d1d5db';
        helpTable.innerHTML = `
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 0.5rem; margin-top: 0.25rem;">
            <span style="color: #10b981;">Concrete</span>
            <span>Contains "Concrete" anywhere</span>
            <span style="color: #10b981;">^Concrete</span>
            <span>Starts with "Concrete"</span>
            <span style="color: #10b981;">Steel$</span>
            <span>Ends with "Steel"</span>
            <span style="color: #10b981;">Concrete.*Wall</span>
            <span>"Concrete" then "Wall"</span>
            <span style="color: #10b981;">Concrete|Steel</span>
            <span>"Concrete" OR "Steel"</span>
          </div>
          <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #404040; color: #9ca3af;">
            <strong>Tip:</strong> For exact match, uncheck "Is Javascript RegEx?"
          </div>
        `;
        
        helpSection.appendChild(helpTitle);
        helpSection.appendChild(helpTable);
        inputForm.appendChild(helpSection);
      }
      
      // Button container
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.gap = '0.375rem';
      buttonContainer.style.marginTop = '0.5rem';
      
      // Execute button
      const executeBtn = document.createElement('button');
      executeBtn.textContent = 'Execute';
      executeBtn.className = 'flex-1 text-xs';
      
      // Cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = 'flex-1 text-xs';
      cancelBtn.style.background = '#404040';
      
      executeBtn.addEventListener('click', async () => {
        executeBtn.disabled = true;
        executeBtn.textContent = 'Running...';
        
        try {
          // Gather all input values
          if (item.inputConfig.type === 'multiText') {
            // For multiText, gather values by field ID
            const values = {};
            let validationError = null;
            
            item.inputConfig.fields.forEach((field, idx) => {
              // Check if this is a typeAwareSearch field
              if (field.type === 'typeAwareSearch') {
                // Find the typeAwareSearch reference in additionalInputs
                const searchInput = additionalInputs.find(inp => inp.isTypeAwareSearch && inp.fieldId === field.id);
                if (searchInput) {
                  const validation = searchInput.ref.validate();
                  if (!validation.valid) {
                    validationError = validation.error;
                  }
                  values[field.id] = searchInput.ref.getSearchOptions();
                }
              } else {
                const input = inputForm.querySelector(`#${field.id}`);
                if (input) {
                  // Handle checkboxes differently from text inputs
                  if (input.type === 'checkbox') {
                    values[field.id] = input.checked;
                  } else {
                    values[field.id] = input.value;
                  }
                }
              }
            });
            
            // Check for validation errors
            if (validationError) {
              console.error('Validation Error:', validationError);
              alert(validationError);
              return;
            }
            
            await item.inputConfig.onExecute(values);
          } else if (item.inputConfig.additionalFields) {
            // For modelSelect with additionalFields, gather values as object
            const additionalValues = {};
            let validationError = null;
            
            item.inputConfig.additionalFields.forEach((field, idx) => {
              const fieldType = field.type || 'text';
              const inputElement = additionalInputs[idx];
              
              if (fieldType === 'checkbox') {
                additionalValues[field.id] = inputElement.checked;
              } else if (fieldType === 'checklist') {
                // Gather checked values from checklist
                const checkboxes = inputElement.querySelectorAll('input[type="checkbox"]:checked');
                const checkedValues = Array.from(checkboxes).map(cb => cb.value);
                additionalValues[field.id] = checkedValues.join(',');
              } else if (fieldType === 'typeAwareValue' || fieldType === 'typeAwareValueByQualifiedProp') {
                // Type-aware value input - validate and get value
                const validation = inputElement.validate();
                if (!validation.valid) {
                  validationError = validation.error;
                }
                additionalValues[field.id] = inputElement.getValue();
              } else {
                additionalValues[field.id] = inputElement.value;
              }
            });
            
            // Check for validation errors
            if (validationError) {
              console.error('Validation Error:', validationError);
              alert(validationError);
              return;
            }
            
            await item.inputConfig.onExecute(mainInput.value, additionalValues);
          } else {
            // For single field only
            await item.inputConfig.onExecute(mainInput.value);
          }
          
          // Collapse form after success
          inputForm.classList.add('hidden');
        } catch (error) {
          console.error('Error executing stub:', error);
        } finally {
          executeBtn.disabled = false;
          executeBtn.textContent = 'Execute';
        }
      });
      
      cancelBtn.addEventListener('click', () => {
        inputForm.classList.add('hidden');
      });
      
      buttonContainer.appendChild(executeBtn);
      buttonContainer.appendChild(cancelBtn);
      inputForm.appendChild(buttonContainer);
      
      // Button click toggles form visibility
      button.addEventListener('click', () => {
        inputForm.classList.toggle('hidden');
        // Refresh default values when opening (for text inputs and checkboxes, not selects)
        if (!inputForm.classList.contains('hidden')) {
          if (item.inputConfig.type === 'multiText') {
            // Refresh all multiText fields
            item.inputConfig.fields.forEach(field => {
              const input = inputForm.querySelector(`#${field.id}`);
              if (input) {
                if (input.tagName.toLowerCase() === 'input') {
                  if (input.type === 'checkbox') {
                    input.checked = field.defaultValue || false;
                  } else {
                    // Call function to get latest saved value
                    input.value = typeof field.defaultValue === 'function' 
                      ? field.defaultValue() 
                      : (field.defaultValue || '');
                  }
                } else if (input.tagName.toLowerCase() === 'select') {
                  // For select elements, try to set the saved value
                  const savedValue = typeof field.defaultValue === 'function' 
                    ? field.defaultValue() 
                    : (field.defaultValue || '');
                  if (savedValue) {
                    input.value = savedValue;
                  }
                }
              }
            });
          } else if (item.inputConfig.type === 'groupSelect') {
            // Refresh group dropdown options from cache
            if (mainInput.tagName.toLowerCase() === 'select') {
              // Remember current selection before refresh
              const previousValue = mainInput.value;
              mainInput.innerHTML = '';
              const groups = getGroupsForDropdown();
              if (groups.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '-- No groups available --';
                mainInput.appendChild(option);
              } else {
                // Determine default: previous value, current account, last used, or first
                const currentGroupURN = getCurrentGroupURN();
                const lastGroupURN = sessionStorage.getItem('tandem-testbed-lastGroupURN');
                const defaultGroupURN = previousValue || currentGroupURN || lastGroupURN || (groups[0]?.urn);
                
                groups.forEach((group) => {
                  const option = document.createElement('option');
                  option.value = group.urn;
                  const displayName = group.name || 'Unnamed Group';
                  option.textContent = `${displayName} - ${group.urn}`;
                  if (group.urn === defaultGroupURN) option.selected = true;
                  mainInput.appendChild(option);
                });
              }
            }
          } else if (item.inputConfig.type !== 'modelSelect') {
            // Refresh single text input
            if (mainInput.tagName.toLowerCase() === 'input') {
              mainInput.value = typeof item.inputConfig.defaultValue === 'function' 
                ? item.inputConfig.defaultValue() 
                : item.inputConfig.defaultValue;
            }
          }
        }
      });
      
      itemContainer.appendChild(button);
      itemContainer.appendChild(inputForm);
    } else {
      // Regular item without input
      button.addEventListener('click', async () => {
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = `${originalText} (running...)`;
        
        try {
          await item.action();
        } catch (error) {
          console.error('Error executing stub:', error);
        } finally {
          button.disabled = false;
          button.textContent = originalText;
        }
      });
      
      itemContainer.appendChild(button);
    }
    
    content.appendChild(itemContainer);
  });
  
  // Toggle visibility on click
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    content.classList.toggle('show');
  });
  
  dropdown.appendChild(toggle);
  dropdown.appendChild(content);
  
  return dropdown;
}

/**
 * Create a STUB with input form (for future use with stubs that need parameters)
 * 
 * Example usage for a stub that needs a User ID:
 * 
 * const stub = createStubWithInput(
 *   'GET User Access Level',
 *   'Get access level for a specific user',
 *   [{ label: 'User ID', placeholder: 'Enter user ID...', id: 'userId' }],
 *   (inputs) => {
 *     const userId = inputs.userId;
 *     return facilityStubs.getFacilityUserAccessLevel(currentFacilityURN, currentFacilityRegion, userId);
 *   }
 * );
 * 
 * @param {string} label - Button label
 * @param {string} description - Description
 * @param {Array} inputFields - Array of {label, placeholder, id} objects
 * @param {Function} onExecute - Function to call with inputs object
 * @returns {HTMLElement} Stub element with expandable input form
 */
export function createStubWithInput(label, description, inputFields, onExecute) {
  const wrapper = document.createElement('div');
  wrapper.className = 'stub-section';
  
  const button = document.createElement('button');
  button.className = 'stub-button';
  button.textContent = label;
  button.title = description;
  
  const inputFormId = `input-${Math.random().toString(36).substr(2, 9)}`;
  const inputForm = document.createElement('div');
  inputForm.id = inputFormId;
  inputForm.className = 'stub-input-form hidden';
  
  // Create input fields
  const inputs = {};
  inputFields.forEach(field => {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = field.placeholder;
    input.id = `${inputFormId}-${field.id}`;
    input.className = 'w-full';
    
    const label = document.createElement('label');
    label.textContent = field.label;
    label.className = 'block text-xs text-dark-text mb-1';
    label.htmlFor = input.id;
    
    inputForm.appendChild(label);
    inputForm.appendChild(input);
    
    inputs[field.id] = input;
  });
  
  // Create execute button
  const executeBtn = document.createElement('button');
  executeBtn.textContent = 'Execute';
  executeBtn.className = 'mt-2';
  
  executeBtn.addEventListener('click', async () => {
    executeBtn.disabled = true;
    executeBtn.textContent = 'Executing...';
    
    try {
      // Gather input values
      const values = {};
      Object.entries(inputs).forEach(([id, input]) => {
        values[id] = input.value;
      });
      
      // Execute the STUB function
      await onExecute(values);
    } catch (error) {
      console.error('Error executing stub:', error);
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = 'Execute';
    }
  });
  
  inputForm.appendChild(executeBtn);
  
  // Toggle visibility on button click
  button.addEventListener('click', () => {
    inputForm.classList.toggle('hidden');
  });
  
  const hint = document.createElement('span');
  hint.className = 'console-hint';
  hint.textContent = 'Check console for output';
  
  wrapper.appendChild(button);
  wrapper.appendChild(hint);
  wrapper.appendChild(inputForm);
  
  return wrapper;
}

