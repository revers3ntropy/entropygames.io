// separate file to fix importing problems

// keeps a globally unique ID number,
// useful for giving components IDs
let currentComponentId = 0;

/** @returns {number} */
export function getComponentId() {
    // increment whenever called
    return currentComponentId++;
}
