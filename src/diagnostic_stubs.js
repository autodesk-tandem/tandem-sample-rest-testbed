import * as utils from './utils.js';

/**
 * See if we've already processed this set of duplicates so it doesn't end up in the report twice or more
 * 
 * @param {Array.<Array.<object>>} duplicatePropsArray 
 * @param {string} categoryName 
 * @param {string} propName 
 * @returns {boolean}
 */
function processedPropertyAlready(duplicatePropsArray, categoryName, propName) {
  for (let j=0; j<duplicatePropsArray.length; j++) {
    const tmpArr = duplicatePropsArray[j];
    if (tmpArr && (tmpArr[0].category === categoryName) && (tmpArr[0].name === propName)) {
      return true;
    }
  }

  return false;
}

/**
 * Iterate through the schema and see if there are properties with same name.
 * 
 * @param {string} modelURN 
 * @returns {Promise<void>}
 */
async function checkForDuplicatePropertiesPerModel(modelURN) {

  let duplicatePropsArray = [];

  await utils.getSchema(modelURN)
    .then((response) => response.json())
    .then((obj) => {
      //showResult(obj);  // dump intermediate result...
      const attrs = obj.attributes;
      for (let i=0; i<attrs.length; i++) {
        const categoryName = attrs[i].category;
        const propName = attrs[i].name;

          // make sure we haven't already processed this one
        if (!processedPropertyAlready(duplicatePropsArray, categoryName, propName)) {
            // exhaustively search the schema for the same name
          const duplicateProps = [];
          for (let k=0; k<attrs.length; k++) {
            if (i != k) { // don't compare against ourselves
              if ((attrs[k].category === categoryName) && (attrs[k].name === propName)) {
                duplicateProps.push(attrs[k]);
              }
            }
          }
          if (duplicateProps.length) {
            duplicateProps.push(attrs[i]);  // if we found a duplicate, push the original we were searching for
            duplicatePropsArray.push(duplicateProps);  // add it to our list of duplicate props
          }
        }
      }
    })
    .catch(error => console.log('error', error));

    // print out the results
  if (duplicatePropsArray.length) {
    console.log("Duplicate properties", duplicatePropsArray);
      // group them all together in a flat list so the table prints out nicely
    const prettyPrintArray = [];
    for (let i=0; i<duplicatePropsArray.length; i++) {
      if (i>0)
        prettyPrintArray.push({name: "----------", category: "----------"});  // push a null object so it acts as a group break in table
      const tmpArr = duplicatePropsArray[i];
      for (let k=0; k<tmpArr.length; k++) {
        prettyPrintArray.push(tmpArr[k]);
      }
    }
    console.table(prettyPrintArray);
  }
  else {
    console.log("No duplicate properties found.");
  }
}

/**
 * Iterate through the schema and see if there are properties with same name.
 * 
 * @returns {Promise<void>}
 */
export async function checkForDuplicateProperties() {

  console.group("STUB: scanForUserProps()");

  const models = await utils.getListOfModels();
  //console.log("Models", models);

  for (let i=0; i<models.length; i++) {
    console.group(`Model[${i}]--> ${models[i].label}`);
    console.log(`Model URN: ${models[i].modelId}`);

    await checkForDuplicatePropertiesPerModel(models[i].modelId);

    console.groupEnd();
  }

  console.groupEnd();
}
