// dependencies

// exports

module.exports = {
    categoryMappings: _getCategoryMappings()
};

// initialization

// private methods

function _getCategoryMappings() {
    return {
        "dlya-litsa": {
            label: 'Для лица',
            types: {
                "ochishenie-tonizirovanie": "Очищающие средства",
                "pilingi-i-skraby": "Пилинги/Скрабы",
                "toniki": "Тоники",
                "uvlazhnenie-kozhi": "Средства для увлажнения кожи",
                "chuvstvitelnaja-kozha": "Уход за чувствительной кожей",
                "problemnaja-kozha": "Уход за жирной проблемной кожей",
                "pitanie-zashita-kozhi": "Питание, защита кожи",
                "linija-uhoda-za-vozrastnoj-kozhej-s-efektom-botoksa": "Мимические и возрастные морщины",
                "zrelaja-kozha": "Уход за зрелой кожей",
                "uhod-za-kozhej-vokrug-glaz": "Уход за кожей век и губами",
            },
            productTypes: {
                "pilingi-i-skraby": ["Пилинг", "Гоммаж", "Скраб"],
                "toniki": ["Тоник"],
                "uvlazhnenie-kozhi": ["Крем-сыворотка", "Сыворотка", "Крем", "Маска"],
                "chuvstvitelnaja-kozha": ["Крем"],
                "problemnaja-kozha": ["Крем", "Маска", "Крем-гель", "Гель"],
                "pitanie-zashita-kozhi": ["Крем"],
                "linija-uhoda-za-vozrastnoj-kozhej-s-efektom-botoksa": ["Крем", "Крем-сыворотка", "Сыворотка", "Лифтинг", "Крем-лифтинг"],
                "zrelaja-kozha": ["Крем", "Крем-гель", "Гель", "Лифтинг", "Крем-лифтинг", "Маска"],
                "uhod-za-kozhej-vokrug-glaz": ["Лосьон", "Крем-гель", "Крем", "Крем-сыворотка", "Сыворотка"]
            }
        },
        "dlya-volos": {
            label: "Для волос",
            types: {
                "shampuni": "Шампуни",
                "balzamy": "Бальзамы для волос",
                "maski": "Маски для волос",
                "toniki": "Тоники для волос"
            },
            productTypes: {
                "shampuni": ["Шампунь"],
                "balzamy": ["Бальзам"],
                "maski": ["Маска"],
                "toniki": ["Тоник"]
            }
        },
        "dlya-tela": {
            label: "Для тела",
            types: {
                "uhod-za-rukami-i-nogami": "Уход за руками и ногами",
                "sredstva-dlja-dusha-i-vanny": "Средства для душа и ванны",
                "anticelljulitnyj-kompleks": "Антицеллюлитный комплекс",
                "solncezashitnye-sredstva": "Солнцезащитные средства"
            },
            productTypes: {
                "uhod-za-rukami-i-nogami": ["Крем", "Лосьон"],
                "sredstva-dlja-dusha-i-vanny": ["Гель"],
                "anticelljulitnyj-kompleks": ["Крем", "Гель"],
                "solncezashitnye-sredstva": ["Крем"]
            }
        },
        "new-line-domashnij-uhod": {
            types: {
                "ochishchayushchie-sredstva": "Очищающие средства",
                "ochishchenie-i-tonizirovanie": "Очищающие средства",
                "uvlazhnenie-kozhi_8h": "Средства для увлажнения кожи"
            }
        },
        "new-line-prof-linija": {
            "korrektsiya-mimicheskikh-morshchin": "Мимические и возрастные морщины",
            "ochishajushie-sredstva": "Очищающие средства",
            "pilingi": "Пилинги/Скрабы",
            "toniki": "Тоники",
            "koncentraty": "Пептиды",
            //"suhie-maski": "Сухие маски New Line",
            //"krem-maski": "Крем-маски New Line",
            "krem-maski-grjazevye": "Крем-маски грязевые",
            "massazhnye-sredstva": "Массажные средства",
            "anticelljulitnye-sredstva-spa-uhod": "Антицеллюлитные средства"
        },
        "sante_qj": {
            "sante": "Уход за руками",
            "uhod-za-rukami": "Уход за ногами",
            "uhod-za-nogami_73": "Уход за телом",
            "uhod-za-licom": "Уход за волосами",
            "uhod-za-volosami-i-telom": "Гели для душа"
        },
        "izrailskaja-kosmetika": {
            "sredstva-dlja-muzhchin": "Средства для мужчин",
            "uhod-za-kozhej-lica": "Для лица",
            "uhod-za-kozhej-lica.ochishchayushchie-sredstva": "Очищающие средства",
            "uhod-za-kozhej-lica.kremi": "Для лица",
            "uhod-za-kozhej-lica.maski": "Для лица",
            "uhod-za-volosami": "Для волос",
            "uhod-za-volosami.shampuni": "Шампуни",
            "uhod-za-volosami.balzamy": "Бальзамы",
            "uhod-za-volosami.maski": "Маски",
            "uhod-za-volosami.maslo-dlya-volos": "Масло для волос",
            "dlya-tela": "Для тела",
            "dlya-tela.geli-dlya-dusha": "Гели для душа",
            "dlya-tela.pilingi": "Для тела",
            "dlya-tela.mylo": "Для тела",
            "dlya-tela.maslo-dlja-tela": "Для тела",
            "dlya-tela.kremi": "Для тела",
            "dlya-tela.soli-i-grjazi": "Для тела",
            "dlya-tela.dezodoranti": "Для тела",
            "dlya-tela.ukhod-za-rukami-i-nogami": "Для тела"
        },
        "biokosmetika-kora-organic": {
            "biokosmetika-kora-organic": "Биокосметика"
        }
    };
}