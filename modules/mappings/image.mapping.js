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
        'images',
        'brand',
        'globalType'
    ];
}

function _getFieldNames() {
    return [
        'Наименование',
        'Изображения',
        'Бренд',
        'Тип товаров'
    ];
}