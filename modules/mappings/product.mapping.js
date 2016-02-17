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
        'brand',
        'price',
        'description',
        'description',
        'composition',
        'action',
        'application',
        'course',
        'contraindications',
        'volume',
        'country',
        'type',
        'skin',
        'for-face',
        'for-hairs',
        'for-body',
        'currency',
        'access',
        'status',
        'globalType',
    ];
}

function _getFieldNames() {
    return [
        'Наименование',
        'Бренд',
        'Цена',
        'Краткое описание',
        'Описание',
        'Активные ингредиенты',
        'Действие',
        'Применение',
        'Курс',
        'Противопоказания',
        'Объём',
        'Страна производитель',
        'Тип продукта',
        'Тип кожи',
        'Для лица. Тип категории',
        'Для волос. Тип категории',
        'Для тела. Тип категории',
        'Валюта',
        'Доступен для заказа',
        'Статус',
        'Тип товаров',
    ]
}