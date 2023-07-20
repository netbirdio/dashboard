export const storeFilterState = (page, filterName, filterValue) => {
    let filterStateObj = {}

    const getValue = localStorage.getItem(page)
    if (getValue) {
        filterStateObj = JSON.parse(getValue)
    }

    filterStateObj[filterName] = filterValue
    localStorage.setItem(page, JSON.stringify(filterStateObj))
}


export const getFilterState = (page, filterName) => {
    const getFilterObject = JSON.parse(localStorage.getItem(page))
    if (getFilterObject) {
        return getFilterObject[filterName]
    }
    return null
}

