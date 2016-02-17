// dependencies

// exports

module.exports = {
    fields: _getFields(),
    fieldNames: _getFieldNames()
};

// initialization

// private methods

function _getFields() {
    return [
        'title',
        'vendorCode'
    ];
}

function _getFieldNames() {
    return [
        'Наименование',
        'Артикул'
    ];
}