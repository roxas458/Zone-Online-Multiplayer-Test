/* ZONE ONLINE character setup catalogue and static configuration.
 * Mutable STARTER_GEAR intentionally remains writable so server catalogue rows
 * can be merged by the client adapter before the setup UI is rendered.
 */
(function(root){
  'use strict';
  const factionLore={
   'Одиночки':'Вольные исследователи Зоны. Не подчиняются единому командованию и ценят личную свободу.',
   'Долг':'Организованная группировка, стремящаяся сдерживать распространение опасностей Зоны.',
   'Свобода':'Сталкеры, выступающие за свободное исследование Зоны и доступ к её тайнам.',
   'Бандиты':'Разрозненные группы, живущие за счёт сделок, влияния и контроля маршрутов.',
   'Военные':'Силы периметра, поддерживающие установленный порядок и контроль территории.',
   'Учёные':'Исследовательские группы, изучающие аномальные явления и артефакты.',
   'Наёмники':'Контрактники, выполняющие заказы различных клиентов.',
   'Монолит':'Закрытая и крайне враждебная группировка из глубины Зоны.',
   'Чистое небо':'Исследователи, стремящиеся понять природу Зоны.',
   'Ренегаты':'Бывшие сталкеры и болотные изгои, живущие отдельными группами и редко доверяющие чужакам.'
  };
  const SETUP_FIRST_NAMES=['Алексей','Андрей','Антон','Артём','Борис','Вадим','Виктор','Глеб','Денис','Егор','Илья','Кирилл','Максим','Михаил','Никита','Олег','Павел','Роман','Сергей','Фёдор','Ярослав','Ярик','Вася','Миша','Коля','Саня','Женя','Лёша','Дима','Влад'];
  const SETUP_CALLSIGNS=['Пугливый','Прокурор','Пророк','Север','Шорох','Клык','Филин','Грач','Сыч','Ворон','Барс','Кремень','Сухарь','Факел','Пепел','Дозор','Маяк','Кочевник','Беркут','Рысь','Глухарь','Вихрь','Кедр','Туман','Скиталец','Компас','Рубеж','Скат','Молчун','Хмурый','Бродяга','Доктор','Профессор','Шустрый','Лис','Седой','Батя','Тихий','Фартовый','Зверь','Крот','Шаман','Бес','Фокусник','Смотрящий','Механик','Шило','Гонец','Сварог','Ястреб','Каспер','Скрипач','Косой','Рыбак','Старый','Малыш','Капрал','Шахтёр','Книжник','Гвоздь','Проводник','Кремень','Патрон','Лоцман','Хан'];
  const setupBackgrounds={
   wanderer:{desc:'Самостоятельный исследователь. Начинает с небольшим запасом репутации у одиночек.'},
   medic:{desc:'Полевой медик. Получает дополнительную аптечку.'},
   technician:{desc:'Техник-ремонтник. Начинает с дополнительными материалами для обслуживания снаряжения.'},
   researcher:{desc:'Помощник учёных. Получает небольшой стартовый кредит доверия у научных групп.'},
   courier:{desc:'Курьер Зоны. Знает проводников и получает скидку на их услуги.'}
  };
  const STARTER_BUDGET=400;
  const STARTER_GEAR={
   weapon_none:{id:'weapon_none',name:'Без основного оружия',type:'Оружие',desc:'Начать без основного оружия.',weight:0,value:0,points:0,slot:'weapon'},
   weapon_pm:{id:'weapon_pm',name:'Пистолет ПМ',type:'Оружие',desc:'Компактное оружие для первых вылазок.',weight:.9,value:420,power:13,price:850,points:55,slot:'weapon'},
   weapon_toz34:{id:'weapon_toz34',name:'ТОЗ-34',type:'Оружие',desc:'Охотничье ружьё для полевых условий.',weight:3.1,value:1700,power:20,price:3100,points:105,slot:'weapon'},
   weapon_aks74u:{id:'weapon_aks74u',name:'АКС-74У',type:'Оружие',desc:'Компактный автомат для опытного новичка.',weight:2.7,value:2300,power:18,price:4200,points:145,slot:'weapon'},
   weapon_ak74:{id:'weapon_ak74',name:'АК-74',type:'Оружие',desc:'Полноразмерный автомат для уверенного бойца.',weight:3.4,value:3100,power:20,price:6800,points:205,slot:'weapon'},
   weapon_vintar:{id:'weapon_vintar',name:'Винтарь-ВС',type:'Оружие',desc:'Точная винтовка под специальный боеприпас.',weight:3.2,value:6800,power:23,price:14500,points:270,slot:'weapon'},
   armor_none:{id:'armor_none',name:'Без бронекостюма',type:'Броня',desc:'Обычная одежда.',weight:0,value:0,points:0,slot:'suit'},
   armor_leather:{id:'armor_leather',name:'Кожаная куртка с пластинами',type:'Броня',desc:'Лёгкая защита для первых переходов.',weight:.7,value:280,defense:2,price:520,points:65,slot:'suit'},
   armor_stalker:{id:'armor_stalker',name:'Комбинезон сталкера М-2',type:'Броня',desc:'Сбалансированный полевой костюм.',weight:1.1,value:1050,defense:3,price:1850,points:115,slot:'suit'},
   armor_zarya:{id:'armor_zarya',name:'Заря',type:'Броня',desc:'Усиленный комбинезон с повышенной защитой.',weight:1.5,value:2200,defense:5,price:3850,points:175,slot:'suit'},
   armor_duty:{id:'armor_duty',name:'Бронекостюм ПСЗ-9д «Долг»',type:'Броня',desc:'Фракционный защитный костюм группировки «Долг».',weight:5,value:2600,defense:6,price:5200,points:185,slot:'suit'},
   armor_freedom:{id:'armor_freedom',name:'Комбинезон «Ветер свободы»',type:'Броня',desc:'Лёгкий костюм группировки «Свобода».',weight:4,value:2100,defense:4,price:4700,points:165,slot:'suit'},
   armor_bandit:{id:'armor_bandit',name:'Куртка бандита',type:'Броня',desc:'Доступная куртка с простыми защитными вставками.',weight:3,value:650,defense:2,price:1200,points:75,slot:'suit'},
   armor_military:{id:'armor_military',name:'Армейский бронекостюм',type:'Броня',desc:'Тяжёлая защитная экипировка военного образца.',weight:8,value:3300,defense:7,price:6800,points:220,slot:'suit'},
   armor_ecologist:{id:'armor_ecologist',name:'Научный костюм ССП-99',type:'Броня',desc:'Защитный костюм для работы в опасной исследовательской среде.',weight:4,value:3000,defense:3,price:6100,points:190,slot:'suit'},
   armor_merc:{id:'armor_merc',name:'Костюм наёмника',type:'Броня',desc:'Универсальный полевой комплект контрактника.',weight:5,value:1800,defense:4,price:3900,points:145,slot:'suit'},
   armor_monolith:{id:'armor_monolith',name:'Костюм «Монолита»',type:'Броня',desc:'Усиленный защитный комплект закрытой группировки.',weight:5,value:2400,defense:5,price:5100,points:180,slot:'suit'},
   armor_clearsky:{id:'armor_clearsky',name:'Броня Чистого неба CS-1',type:'Броня',desc:'Фракционная полевая броня исследовательской группировки.',weight:7,value:1900,defense:5,price:4400,points:155,slot:'suit'},
   armor_renegade:{id:'armor_renegade',name:'Болотный комбинезон ренегата',type:'Броня',desc:'Авторский комплект с защитными накладками для болотных троп.',weight:4,value:950,defense:3,price:2300,points:105,slot:'suit'},
   armor_sunrise:{id:'armor_sunrise',name:'Комбинезон «Заря» (полевой вариант)',type:'Броня',desc:'Лёгкий полевой комплект с умеренной защитой и удобством в переходах.',weight:2.1,value:1700,defense:4,price:3300,points:145,slot:'suit'},
   armor_berill:{id:'armor_berill',name:'Бронекостюм «Берилл-5М»',type:'Броня',desc:'Тяжёлый защитный комплект с акцентом на физическую защиту.',weight:8.5,value:4200,defense:8,price:8900,points:245,slot:'suit'},
   armor_guardian:{id:'armor_guardian',name:'«Страж свободы»',type:'Броня',desc:'Усиленный комплект группировки «Свобода» для длительных выходов.',weight:7.5,value:3900,defense:7,price:8200,points:225,slot:'suit'},
   armor_cs3a:{id:'armor_cs3a',name:'Бронекостюм Чистого Неба CS-3a',type:'Броня',desc:'Тяжёлый комплект исследовательской группировки для опасных экспедиций.',weight:8.2,value:4100,defense:7,price:8500,points:230,slot:'suit'},
   armor_ps5m:{id:'armor_ps5m',name:'Универсальная защита ПС5-М',type:'Броня',desc:'Универсальный защитный комплект с умеренной защитой от разных воздействий.',weight:6.8,value:3200,defense:6,price:6900,points:205,slot:'suit'},
   armor_duty_veteran:{id:'armor_duty_veteran',name:'ПСЗ-7 «Ветеран»',type:'Броня',desc:'Фракционный комплект: Долг. Отдельная модель экипировки с собственными параметрами защиты.',weight:5.4,value:2562,defense:5,price:6100,points:205,slot:'suit'},
   armor_duty_defender:{id:'armor_duty_defender',name:'Броня «Защитник»',type:'Броня',desc:'Фракционный комплект: Долг. Отдельная модель экипировки с собственными параметрами защиты.',weight:7.8,value:4116,defense:8,price:9800,points:255,slot:'suit'},
   armor_freedom_wind:{id:'armor_freedom_wind',name:'Комбинезон «Свободный ветер»',type:'Броня',desc:'Фракционный комплект: Свобода. Отдельная модель экипировки с собственными параметрами защиты.',weight:3.2,value:1806,defense:4,price:4300,points:155,slot:'suit'},
   armor_freedom_wanderer:{id:'armor_freedom_wanderer',name:'Костюм «Странник»',type:'Броня',desc:'Фракционный комплект: Свобода. Отдельная модель экипировки с собственными параметрами защиты.',weight:5.8,value:3024,defense:6,price:7200,points:205,slot:'suit'},
   armor_military_guard:{id:'armor_military_guard',name:'Комплект «Страж периметра»',type:'Броня',desc:'Фракционный комплект: Военные. Отдельная модель экипировки с собственными параметрами защиты.',weight:6.5,value:2730,defense:6,price:6500,points:205,slot:'suit'},
   armor_military_kordon:{id:'armor_military_kordon',name:'Бронекостюм «Кордон-М»',type:'Броня',desc:'Фракционный комплект: Военные. Отдельная модель экипировки с собственными параметрами защиты.',weight:8.7,value:4284,defense:8,price:10200,points:265,slot:'suit'},
   armor_merc_contract:{id:'armor_merc_contract',name:'Костюм «Контракт»',type:'Броня',desc:'Фракционный комплект: Наёмники. Отдельная модель экипировки с собственными параметрами защиты.',weight:4.6,value:1932,defense:4,price:4600,points:165,slot:'suit'},
   armor_merc_blue:{id:'armor_merc_blue',name:'Броня «Синий легион»',type:'Броня',desc:'Фракционный комплект: Наёмники. Отдельная модель экипировки с собственными параметрами защиты.',weight:7.1,value:3654,defense:7,price:8700,points:235,slot:'suit'},
   armor_clearsky_azure:{id:'armor_clearsky_azure',name:'Комбинезон «Лазурь»',type:'Броня',desc:'Фракционный комплект: Чистое небо. Отдельная модель экипировки с собственными параметрами защиты.',weight:4.2,value:2184,defense:5,price:5200,points:180,slot:'suit'},
   armor_loner_mist:{id:'armor_loner_mist',name:'Костюм «Туман»',type:'Броня',desc:'Фракционный комплект: Одиночки. Отдельная модель экипировки с собственными параметрами защиты.',weight:3.8,value:1638,defense:4,price:3900,points:150,slot:'suit'},
   armor_monolith_acolyte:{id:'armor_monolith_acolyte',name:'Костюм «Сектант»',type:'Броня',desc:'Фракционный комплект: Монолит. Отдельная модель экипировки с собственными параметрами защиты.',weight:6.4,value:3192,defense:6,price:7600,points:215,slot:'suit'},
   armor_bandit_collector:{id:'armor_bandit_collector',name:'Куртка «Сборщик»',type:'Броня',desc:'Фракционный комплект: Бандиты. Отдельная модель экипировки с собственными параметрами защиты.',weight:2.8,value:630,defense:2,price:1500,points:80,slot:'suit'},
   armor_renegade_marsh:{id:'armor_renegade_marsh',name:'Комбинезон «Топь»',type:'Броня',desc:'Фракционный комплект: Ренегаты. Отдельная модель экипировки с собственными параметрами защиты.',weight:3.6,value:1092,defense:3,price:2600,points:115,slot:'suit'},
   armor_science_expedition:{id:'armor_science_expedition',name:'Костюм «Экспедиция»',type:'Броня',desc:'Фракционный комплект: Учёные. Отдельная модель экипировки с собственными параметрами защиты.',weight:4.8,value:2856,defense:4,price:6800,points:195,slot:'suit'},
   detector_none:{id:'detector_none',name:'Без детектора',type:'Детектор',desc:'Поиск артефактов без прибора.',weight:0,value:0,points:0,slot:'tool'},
   detector_echo:{id:'detector_echo',name:'Детектор «Отклик»',type:'Детектор',desc:'Базовый прибор для поиска аномальных объектов.',weight:.6,value:220,price:650,points:65,slot:'tool'},
   detector_bear:{id:'detector_bear',name:'Детектор «Медведь»',type:'Детектор',desc:'Более удобный прибор с расширенным диапазоном.',weight:.8,value:650,price:1650,points:115,slot:'tool'},
   backpack_standard:{id:'backpack_standard',name:'Стандартный рюкзак',type:'Рюкзак',desc:'Базовая вместимость 50 кг.',weight:1,value:300,capacity:50,points:0,slot:'backpack'},
   backpack_field:{id:'backpack_field',name:'Полевой рюкзак',type:'Рюкзак',desc:'Вместимость 65 кг.',weight:1.4,value:650,capacity:65,price:1250,points:45,slot:'backpack'},
   backpack_expedition:{id:'backpack_expedition',name:'Экспедиционный рюкзак',type:'Рюкзак',desc:'Вместимость 80 кг.',weight:1.8,value:1500,capacity:80,price:2850,points:75,slot:'backpack'},
   med:{id:'med',name:'Аптечка',type:'Медицина',desc:'Полевой медицинский набор.',weight:.4,value:100,points:25},
   bandage:{id:'bandage',name:'Бинт',type:'Медицина',desc:'Расходный перевязочный материал.',weight:.2,value:45,points:10},
   anti_rad:{id:'anti_rad',name:'Антирад',type:'Медицина',desc:'Средство от радиационного заражения.',weight:.1,value:100,points:20},
   bread:{id:'bread',name:'Хлеб',type:'Еда',desc:'Простой запас еды.',weight:.3,value:35,points:10},
   canned:{id:'canned',name:'Консервы',type:'Еда',desc:'Сытный полевой паёк.',weight:.45,value:65,points:15},
   water:{id:'water',name:'Бутылка воды',type:'Еда',desc:'Запас питьевой воды.',weight:.5,value:25,points:10}
  };
  const STARTER_WEAPON_SERVER_IDS=new Set(['pm_stalker','sig220','beretta','walther_p99','usp_compact','desert_eagle','bm16','winchester1300','spas12','ks23','akm_74','aks74','ak101','ak102','lr300','g36','l85','aug','aek971','asval','groza_oc14','akm_47','m4','sv98','vss_vintorez','remington700','gauss_prototype','pkm','m249','rg6']);
  const factionSuit={ 'Одиночки':'armor_stalker','Долг':'armor_duty','Свобода':'armor_freedom','Бандиты':'armor_bandit','Военные':'armor_military','Учёные':'armor_ecologist','Наёмники':'armor_merc','Монолит':'armor_monolith','Чистое небо':'armor_clearsky','Ренегаты':'armor_renegade' };
  const api=Object.freeze({ factionLore, SETUP_FIRST_NAMES, SETUP_CALLSIGNS, setupBackgrounds, STARTER_BUDGET, STARTER_GEAR, STARTER_WEAPON_SERVER_IDS, factionSuit });
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ZoneCharacterSetupData=api;
})(typeof window!=='undefined'?window:globalThis);
