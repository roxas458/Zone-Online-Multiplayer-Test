// ZONE ONLINE 4.61.52 browser client. Modular systems + compatibility facade. ZONE REPORTS / STARTER LOADOUT / SQUAD PAGE RESTORE.
const clone=o=>JSON.parse(JSON.stringify(o));
const base=window.ZoneCoreDefaults;
const QUICK_USE_SLOTS=[
 {id:'anti_rad',icon:'☢',label:'Антирад'},
 {id:'med',icon:'✚',label:'Аптечка'},
 {id:'bandage',icon:'▤',label:'Бинт'},
 {id:'bread',icon:'🥫',label:'Еда'}
];
const NPC_DIALOGUE_TEMPLATES=new Map((base.npcs||[]).map(n=>[n.id,{greeting:n.greeting,topics:clone(n.topics||[])}]));
// Dialogue content and generation live in a focused module; retain legacy call sites.
const npcDialogueSystem=window.ZoneNpcDialogue;
const generatedNpcDialogue=npcDialogueSystem.generatedNpcDialogue;
const applySignatureDialogue=npcDialogueSystem.applySignatureDialogue;

const hadLocalSave=!!window.ZoneCore.saveManager.read(window.ZoneCoreConfig.saveKey,null);
let g=window.ZoneCore.saveManager.read(window.ZoneCoreConfig.saveKey,null)||clone(base);
if(g.characterCreated===undefined)g.characterCreated=hadLocalSave;
let chosenLoc=null,activeNpc=null,questFilter="all",ignoreNpcInteractionReplyFor=null;
const $=id=>document.getElementById(id);
// Convert legacy locally-saved random NPCs as well as server NPCs to Zone callsigns.
const STORY_NPC_IDS=new Set(['sid','wolf','fanatic','scout','bandit','barman','seriy','scientist','merc','prof','freedom','guide','loner','lebedev','novikov','cold','renegade_leader','renegade_scout','lukash','voronin','sultan','beard','charon','wolfhound','archivist','kravtsov','monolith_scout']);
const CALLSIGN_FIRST=['Васян','Лёша','Максим','Влад','Колька','Андрюха','Сева','Пётр','Жора','Андрей','Димон','Ромка','Саня','Федя','Гриша','Вован','Тоха','Илюха','Мишаня','Егор','Борис','Тимур','Кир','Паша','Витёк','Глеб','Антон','Ярик','Стас','Даня','Аркадий','Захар','Игнат','Клим','Фома','Гена','Лёня','Трофим','Матвей','Славик','Марат','Руслан','Виталик','Юрец','Костян','Женёк','Михалыч','Дэн','Рыж','Батя'];
const CALLSIGN_LAST=['Глюк','Дворецкий','Скелет','Князь','Глобус','Француз','Грубиян','Авторитет','Стрелец','Железный','Шутник','Бес','Клык','Грач','Филин','Болт','Шуруп','Кабан','Беркут','Сыч','Глухарь','Рысь','Ворон','Барс','Прапор','Дизель','Факел','Сухарь','Патрон','Гильза','Затвор','Приклад','Калибр','Механик','Бродяга','Фартовый','Лютый','Шальной','Бывалый','Кремень','Медведь','Вепрь','Ястреб','Сокол','Барсук','Шершень','Комар','Камень','Бетон','Кирпич','Пепел','Дым','Уголь','Мотор','Порох','Гвоздь','Лом','Домкрат','Картечь','Шторм','Гром','Вихрь','Север','Южак','Батон','Кекс','Бублик','Шпрот','Пончик','Самовар','Квас','Чебур','Фарт','Казак','Кочевник','Гусар','Атаман','Барин','Профессор','Маэстро','Банкир','Шкипер','Капитан','Командор','Рубака','Снайпер','Лоцман','Каскадёр','Писарь','Художник','Поэт','Философ','Бухгалтер','Адвокат','Артист','Трактирщик','Скрипач','Кузнец','Шахтёр','Сапёр','Пилот','Беглец','Везунчик','Крестный','Шериф','Кондор','Тайфун','Бархан','Гранит','Титан','Рубеж','Дозор','Капкан','Мародёр','Зверь','Пёс','Волк','Зубр','Пузырь','Хмель','Трактор','Слесарь','Маяк','Громила','Голландец','Цыган','Монах','Купец','Боцман','Граф','Маркиз','Княжич','Сенатор','Губернатор','Генерал','Полковник','Ефрейтор','Рядовой','Комиссар','Каратель','Палач','Смотрящий','Хозяин','Старшина','Колдун','Знахарь','Кулибин','Самородок','Балагур','Весельчак','Молчун','Заноза','Хитрец','Проныра','Хапуга','Кочегар','Громовержец'];
function migrateLocalNpcCallsigns(){
 const used=new Set((g.npcs||[]).filter(n=>STORY_NPC_IDS.has(n.id)).map(n=>String(n.name||'').trim()));
 for(const npc of (g.npcs||[])){
  if(!npc||STORY_NPC_IDS.has(npc.id))continue;
  const id=String(npc.id||'unknown-npc');const featured=({'wander_cordon_0':'Влад Князь','wander_cordon_1':'Колька Глобус','wander_cordon_2':'Андрюха Француз','wander_cordon_3':'Сева Грубиян','wander_cordon_4':'Пётр Авторитет','wander_cordon_5':'Жора Стрелец','wander_cordon_6':'Влад Железный','wander_cordon_7':'Андрей Шутник'}[id]);if(featured&&!used.has(featured)){npc.name=featured;used.add(featured);npc.generated=true;continue;}let h=2166136261;
  for(let i=0;i<id.length;i++){h^=id.charCodeAt(i);h=Math.imul(h,16777619);}
  h>>>=0;let name='';
  for(let step=0;step<CALLSIGN_FIRST.length*CALLSIGN_LAST.length;step++){
   const ix=(h+step)%(CALLSIGN_FIRST.length*CALLSIGN_LAST.length);
   const candidate=CALLSIGN_FIRST[Math.floor(ix/CALLSIGN_LAST.length)]+' '+CALLSIGN_LAST[ix%CALLSIGN_LAST.length];
   if(!used.has(candidate)){name=candidate;break;}
  }
  if(name){npc.name=name;used.add(name);npc.generated=true;}
 }
}
// Save migration: extend existing saves without resetting player progress.
function migrateWorld(){
 return window.ZoneWorldMigration.migrate(g,base,{clone,addItem,migrateLocalNpcCallsigns:()=>migrateLocalNpcCallsigns()});
}
migrateWorld();
window.ZoneCore.state.set(g, "initial-migration");
g.careerStats ||= {kills:0,discoveries:0,travelled:0,conversations:0};
g.options ||= {largeText:false,reduceMotion:false,compactUI:false};
g.visitedLocations ||= [g.loc];
g.careerStats.kills=Number(g.careerStats.kills)||0;g.careerStats.discoveries=Number(g.careerStats.discoveries)||0;g.careerStats.travelled=Number(g.careerStats.travelled)||0;g.careerStats.conversations=Number(g.careerStats.conversations)||0;
try{window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);}catch(e){console.warn("Could not persist save migration",e);}


// Original ZONE ONLINE weapon catalogue and authored location POIs.
const weaponCatalogue=[
["pm","ПМм","Пистолеты","Пистолет","9×18 мм",0.9,850,78],["fort","Форт-12","Пистолеты","Пистолет","9×18 мм",0.95,1100,82],["udp","УДП «Компакт»","Пистолеты","Пистолет",".45 ACP",1.1,1450,76],["kora","Кора-919","Пистолеты","Пистолет","9×19 мм",0.95,1350,81],["martha","Мартышка","Пистолеты","Пистолет","9×18 мм",0.85,1250,74],
["spsa","СПСА-14","Дробовики","Дробовик","12 калибр",3.6,3100,72],["chaser","Chaser-13","Дробовики","Дробовик","12 калибр",3.1,2700,80],["protecta","Protecta","Дробовики","Дробовик","12 калибр",4.2,4200,68],["sawed","Обрез","Дробовики","Дробовик","12 калибр",2.4,1250,62],
["akm","АКМ-74/2","Автоматы","Автомат","5.45×39 мм",3.4,3600,80],["akm_gl","АКМ-74/2У","Автоматы","Автомат","5.45×39 мм",3.1,3300,77],["abakan","АС-96/2","Автоматы","Автомат","5.45×39 мм",3.6,5100,83],["obokan","Обокан","Автоматы","Автомат","5.45×39 мм",3.8,4800,79],["tr301","ТРс-301","Автоматы","Автомат","5.56×45 мм",3.2,5200,85],["il86","ИЛ86","Автоматы","Автомат","5.56×45 мм",3.7,4700,73],["gp37","ГП37","Автоматы","Автомат","5.56×45 мм",3.5,5900,88],["groza","Гроза","Автоматы","Автомат","9×39 мм",3.9,7200,80],
["vintar","Винтарь ВС","Винтовки","Винтовка","9×39 мм",3.4,8900,86],["svd","СВДм-2","Винтовки","Винтовка","7.62×54 мм",4.3,9800,84],["svu","СВУмк2","Винтовки","Винтовка","7.62×54 мм",3.8,9300,79],["gauss","Гаусс-пушка","Особое","Экспериментальное","энергетические элементы",5.2,18000,95],["bulldog","Бульдог-6","Особое","Гранатомёт","выстрелы ВОГ",5.0,12500,70],["rp74","РП-74","Особое","Пулемёт","7.62×54 мм",7.8,14500,76],["knife","Нож сталкера","Особое","Инструмент","—",0.35,180,90],
["walther","ПМм-Н","Пистолеты","Пистолет","9×18 мм",0.95,1650,82],["usp","УСП-45","Пистолеты","Пистолет",".45 ACP",1.0,2100,79],["saiga","Сайга-12К","Дробовики","Дробовик","12 калибр",3.8,4600,84],["toz","ТОЗ-34","Дробовики","Двуствольное ружьё","12 калибр",3.2,1900,66],["ak74","АК-74","Автоматы","Автомат","5.45×39 мм",3.3,3900,81],["aksu","АКС-74У","Автоматы","Автомат","5.45×39 мм",2.9,3500,75],["fn2000","ФН2000","Автоматы","Автомат","5.56×45 мм",4.0,9800,90],["famas","ФАМАС","Автоматы","Автомат","5.56×45 мм",3.6,7600,77],["vsk","ВСК-94","Винтовки","Винтовка","9×39 мм",3.2,8200,83],["mosin","Мосинка","Винтовки","Винтовка","7.62×54 мм",4.1,4300,70],["rpk","РПК-74","Особое","Ручной пулемёт","5.45×39 мм",4.7,8900,80],["svt","СВТ-40","Винтовки","Винтовка","7.62×54 мм",3.9,6100,73],["gauss_mk2","Гаусс-модуль","Особое","Экспериментальное","энергетические элементы",5.4,22000,97],
["pm_stalker","ПМ (полевой) - улучшенный","Пистолеты","Пистолет","9×18 мм",0.95,1750,86],
["sig220","SIG 220","Пистолеты","Пистолет",".45 ACP",1.05,2450,84],
["beretta","Беретта 92FS","Пистолеты","Пистолет","9×19 мм",0.98,2300,82],
["walther_p99","Walther P99","Пистолеты","Пистолет","9×19 мм",0.9,2600,88],
["usp_compact","УСП Компакт","Пистолеты","Пистолет",".45 ACP",0.92,2800,87],
["desert_eagle","Desert Eagle","Пистолеты","Крупнокалиберный пистолет",".45 ACP",1.7,5200,78],
["bm16","БМ-16","Дробовики","Двуствольное ружьё","12 калибр",3.0,1550,65],
["winchester1300","Винчестер 1300","Дробовики","Помповое ружьё","12 калибр",3.4,2950,80],
["spas12","СПАС-12","Дробовики","Дробовик","12 калибр",4.0,4900,85],
["ks23","КС-23","Дробовики","Дробовик","специальный калибр",3.9,5300,75],
["akm_74","АКМ-74/2 (ранний выпуск)","Автоматы","Автомат","5.45×39 мм",3.5,3450,72],
["aks74","АКС-74","Автоматы","Автомат","5.45×39 мм",3.4,4100,82],
["ak101","АК-101","Автоматы","Автомат","5.56×45 мм",3.6,6500,89],
["ak102","АК-102","Автоматы","Автомат","5.56×45 мм",3.3,6100,87],
["lr300","LR-300","Автоматы","Автомат","5.56×45 мм",3.2,7200,88],
["g36","Г36","Автоматы","Автомат","5.56×45 мм",3.6,8200,91],
["l85","L85A2","Автоматы","Автомат","5.56×45 мм",4.1,6800,79],
["aug","AUG A1","Автоматы","Автомат","5.56×45 мм",3.6,7900,86],
["aek971","АЕК-971","Автоматы","Автомат","5.45×39 мм",3.5,7600,87],
["asval","АС «Вал»","Автоматы","Специальный автомат","9×39 мм",2.9,9200,89],
["groza_oc14","ОЦ-14М «Гроза»","Автоматы","Специальный автомат","9×39 мм",3.8,8100,83],
["akm_47","АКМ","Автоматы","Автомат","7.62×39 мм",3.7,4300,76],
["m4","М4А1","Автоматы","Автомат","5.56×45 мм",3.4,8500,90],
["sv98","СВ-98","Винтовки","Снайперская винтовка","7.62×54 мм",5.0,12500,90],
["vss_vintorez","ВСС «Винторез»","Винтовки","Специальная винтовка","9×39 мм",3.2,11500,91],
["remington700","Remington 700","Винтовки","Снайперская винтовка",".308 Win",4.4,9800,84],
["gauss_prototype","Прототип гаусс-винтовки","Особое","Экспериментальное","энергетические элементы",5.6,26000,92],
["pkm","ПКМ","Особое","Пулемёт","7.62×54 мм",7.5,15800,82],
["m249","М249","Особое","Ручной пулемёт","5.56×45 мм",7.2,14900,85],
["rg6","РГ-6","Особое","Гранатомёт","выстрелы ВОГ",6.0,13900,74]
];
const poiSeed={
cordon:[["Бункер Сидоровича","Торговля","Торговец и базовые припасы"],["Деревня новичков","Стоянка","Костёр и слухи сталкеров"],["Мост через железную дорогу","Переход","Старый маршрут на север"],["Аномальное поле у дороги","Аномалия","Место для поиска артефактов"]],
dump:[["Кладбище техники","Тайник","Разобранные машины и детали"],["Свалка металлолома","Ресурсы","Материалы и случайные находки"],["Пост бандитов","Пост","Контролируемый проход"],["Северный проход","Переход","Маршрут к Ростку"]],
bar:[["Бар «100 рентген»","Безопасная зона","Отдых, новости и торговля"],["Стоянка Долга","Пост","Патруль и групповые поручения"],["Доска объявлений","Задания","Работа от сталкеров и торговцев"]],
agro:[["Подземный комплекс","Исследование","Заброшенные лабораторные помещения"],["Северный двор","Переход","Выход к промышленным секторам"],["Старый блокпост","Пост","Следы прежнего гарнизона"]],
dark:[["Промышленный двор","Ресурсы","Разрушенные цеха"],["Заброшенная ферма","Стоянка","Временное укрытие"],["Южная дорога","Переход","Маршрут к Кордону"]],
yantar:[["Научный бункер","Безопасная зона","Исследовательская база"],["Берег озера","Аномалия","Зона наблюдений"],["Старый карьер","Тайник","Место полевых находок"]],
army:[["Северный блокпост","Пост","Позиции Свободы"],["Складской ангар","Ресурсы","Промышленные запасы"],["Лесная тропа","Переход","Выход к Рыжему лесу"]],
red:[["Лесная развилка","Переход","Переплетение старых троп"],["Заброшенный лагерь","Стоянка","Следы прежней экспедиции"],["Аномальная поляна","Аномалия","Нестабильная зона"]],
pripyat:[["Площадь города","Ориентир","Центральная часть Припяти"],["Старая прачечная","Укрытие","Известная точка сбора"],["Культурный центр","Исследование","Заброшенное общественное здание"]],
zaton:[["Скадовск","Безопасная зона","Плавучая база сталкеров"],["Сгоревший хутор","Тайник","Заброшенные постройки"],["Затонувшая баржа","Ресурсы","Старое судно и находки"],["Лесничество","Стоянка","Укрытие на окраине"]],
jupiter:[["Завод Юпитер","Исследование","Промышленный комплекс"],["Цеха завода","Ресурсы","Старые производственные корпуса"],["Переход к Янову","Переход","Маршрут к железнодорожному узлу"]],
radar:[["Станция Янов","Безопасная зона","Главная точка встреч"],["Буфет","Торговля","Еда и разговоры"],["Пункт учёных","Исследование","Рабочая база исследователей"]],
wild:[["Заброшенная школа","Ориентир","Пустующее здание села"],["Сельская улица","Тайник","Старые дворы"],["Окраина Копачей","Аномалия","Место полевых наблюдений"]],
darkhollow:[["Площадка техники","Ресурсы","Старая техника"],["Командный пункт","Пост","Заброшенный пункт управления"],["Северный проход","Переход","Тропа к соседним секторам"]],
limansk:[["Железная роща","Аномалия","Нестабильный участок"],["Старый мост","Переход","Узкий маршрут"],["Разрушенный цех","Тайник","Промышленные руины"]]
};
const extraPoi48={
 cordon:[["Старая водокачка","Исследование","Заброшенный узел водоснабжения."],["Южный блокпост","Пост","Проверяй обстановку у периметра."],["Овраг у линии электропередачи","Тайник","Следы временной стоянки и старых припасов."]],
 dump:[["Разбитый карьер","Ресурсы","Куча строительного лома и следы техники."],["Тоннель под насыпью","Переход","Короткий, но плохо просматриваемый проход."],["Лагерь сборщиков","Стоянка","Место, где сталкеры сортируют найденный металл."]],
 bar:[["Старая диспетчерская","Исследование","Архивные записи о движении отрядов."],["Внешний КПП Ростка","Пост","Проверка пропусков и патрульные сводки."],["Мастерская у ангара","Ремонт","Местные техники принимают заказы."]],
 agro:[["Восточная проходная","Пост","Следы старого военного поста."],["Служебный тоннель","Переход","Подземный маршрут между корпусами."],["Радиорубка Агропрома","Исследование","Старое оборудование связи."]],
 dark:[["Заброшенная котельная","Укрытие","Толстые стены и старый технический подвал."],["Южный карьер","Ресурсы","Обломки техники и строительные материалы."],["Лагерь на трубе","Стоянка","Временная стоянка местных сталкеров."]],
 yantar:[["Северный научный пост","Пост","Пункт наблюдения за аномалиями."],["Старый элеватор","Тайник","Заброшенное хранилище у берега."],["Полевой медблок","Медицина","Остатки экспедиционного медпункта."]],
 army:[["Западная казарма","Укрытие","Пустующее здание бывшего гарнизона."],["Тренировочный полигон","Исследование","Следы старых учений."],["Склад ГСМ","Ресурсы","Промышленная площадка с опасными остатками."]],
 red:[["Лесная метеостанция","Исследование","Старые приборы наблюдения."],["Заваленная просека","Переход","Обходной маршрут сквозь лес."],["Охотничий привал","Стоянка","Следы костра и охотничьих засидок."]],
 pripyat:[["Школа № 1","Исследование","Заброшенные классы и архивные бумаги."],["Подземный переход","Переход","Укрытый путь между кварталами."],["Дворец культуры","Ориентир","Крупное здание в центральном районе."]],
 zaton:[["Станция техобслуживания","Ремонт","Старые инструменты и ремонтный бокс."],["Затопленный причал","Переход","Низкий береговой маршрут."],["Лесной кордон","Пост","Наблюдательная точка на окраине болот."]],
 jupiter:[["Заводская проходная № 2","Пост","Контроль входа на территорию завода."],["Испытательный корпус","Исследование","Закрытая часть промышленного комплекса."],["Технический тоннель","Переход","Сервисный маршрут под заводом."]],
 yanov:[["Старая диспетчерская","Исследование","Журналы железнодорожного узла."],["Водонапорная башня","Ориентир","Видимая точка на открытой местности."],["Восточная платформа","Переход","Выход к промышленным маршрутам."]],
 kopachi:[["Погреб на окраине","Тайник","Заваленное хозяйственное помещение."],["Старая амбулатория","Медицина","Следы эвакуации и медицинские шкафы."],["Заросший двор","Стоянка","Тихая точка для короткой передышки."]],
 volkhov:[["Радиолокационный пост","Исследование","Старые антенны и приборы."],["Технический гараж","Ремонт","Заброшенный ремонтный участок."],["Южный КПП","Пост","Пункт наблюдения за дорогой."]],
 iron:[["Северный ангар","Укрытие","Промышленное укрытие с несколькими входами."],["Кабельная галерея","Переход","Узкий маршрут через старые коммуникации."],["Лабораторный двор","Исследование","Следы полевого исследовательского лагеря."]],
 swamps:[["Старая лодочная станция","Переход","Путь между островками суши."],["Полевой госпиталь","Медицина","Заброшенный медицинский пункт экспедиции."],["Смотровой островок","Ориентир","Сухая площадка с обзором на топь."]]
};
function ensureZoneContent(){
 g.keyPoints ||= {};
 for(const l of g.locations){if(!g.keyPoints[l.id])g.keyPoints[l.id]=(poiSeed[l.id]||[["Старая стоянка","Стоянка","Место отдыха"],["Заброшенный объект","Исследование","Точка для изучения района"],["Полевой маршрут","Переход","Путь в соседний сектор"]]).map((p,i)=>({id:l.id+"_poi_"+i,name:p[0],kind:p[1],desc:p[2],discovered:false}));
 }
 const extras=window.ZONE_CONTENT?.extraPoints||{};
 for(const [loc,points] of Object.entries(extraPoi48)){g.keyPoints[loc] ||= [];for(let i=0;i<points.length;i++){const id=loc+"_real48_"+i;if(!g.keyPoints[loc].some(x=>x.id===id))g.keyPoints[loc].push({id,name:points[i][0],kind:points[i][1],desc:points[i][2],discovered:false});}}
 for(const [loc,points] of Object.entries(extras)){g.keyPoints[loc] ||= [];for(let i=0;i<points.length;i++){const id=loc+"_extra_"+i;if(!g.keyPoints[loc].some(x=>x.id===id))g.keyPoints[loc].push({id,name:points[i][0],kind:points[i][1],desc:points[i][2],discovered:false});}}

 g.discoveredWeapons ||= ["pm","sawed"];
 g.weaponConditions ||= {};
 for(const w of weaponCatalogue)if(g.weaponConditions[w[0]]==null)g.weaponConditions[w[0]]=w[7];
 // Add a complete, discoverable catalogue without forcing duplicate inventory stacks.
 for(const w of weaponCatalogue){if(!g.items.some(x=>x.id===w[0]))g.armoryOwned ||= [];}
 g.armoryOwned ||= [];
}
ensureZoneContent();
let invFilterState="all";
function renderKeyPoints(){
 const l=here(),pts=g.keyPoints?.[l.id]||[];
 $("keyPoints").innerHTML=pts.map(p=>`<div class="poi ${p.discovered?"discovered":""}"><b>${p.discovered?"✓":"⌖"} ${p.name}</b><span class="poi-marker">${p.kind}</span><small>${p.discovered?p.desc:"Не исследовано. Осмотри район, чтобы получить сведения."}</small>${p.discovered?"":`<div style="margin-top:7px"><button onclick="discoverPoint('${p.id}')">Исследовать</button></div>`}</div>`).join("");
}
function discoverPoint(id){
 const p=Object.values(g.keyPoints).flat().find(x=>x.id===id);if(!p||p.discovered)return;
 if(g.stamina<5)return alert("Недостаточно выносливости.");
 p.discovered=true;g.careerStats||={};g.careerStats.discoveries=(g.careerStats.discoveries||0)+1;g.stamina-=5;if(zoneSocket?.connected)zoneSocket.emit('world:poi:discover',{id:p.id,location:g.loc,name:p.name});else g.xp+=12;
 log("Отмечена ключевая точка: "+p.name+".");news("Новая отметка на карте",p.name+" — "+p.desc);
 if(Math.random()<.38){let w=weaponCatalogue[Math.floor(Math.random()*weaponCatalogue.length)];if(!g.discoveredWeapons.includes(w[0])){g.discoveredWeapons.push(w[0]);addItem(w[0],w[1],"Оружие","Найденное оружие. Состояние: "+w[7]+"%.",w[5],w[6]);g.items.find(x=>x.id===w[0]).condition=w[7];g.items.find(x=>x.id===w[0]).icon=weaponGlyph(w[0]);log("Найдено снаряжение: "+w[1]+".");}}
 save();
}
function applySharedDiscoveredPoints(points){if(!points||typeof points!=='object')return;for(const [loc,ids] of Object.entries(points)){for(const p of (g.keyPoints?.[loc]||[])){if(Array.isArray(ids)&&ids.includes(p.id))p.discovered=true;}}renderKeyPoints();if($('world').classList.contains('active'))selectLocation(g.loc);}
const weaponGlyphs={walther:"▰",usp:"◧",saiga:"═",toz:"╾",ak74:"━",aksu:"┅",fn2000:"━",famas:"┉",vsk:"━━",mosin:"━━",rpk:"╍",svt:"━━",gauss_mk2:"⌁",pm:"▰",fort:"◧",udp:"▱",kora:"◩",martha:"▰",spsa:"╾",chaser:"╼",protecta:"═",sawed:"╾",akm:"━",akm_gl:"┅",abakan:"━",obokan:"┉",tr301:"━",il86:"┅",gp37:"━",groza:"╾",vintar:"━",svd:"━━",svu:"━━",gauss:"⌁",bulldog:"▣",rp74:"╍",knife:"†"};
function weaponGlyph(id){return weaponGlyphs[id]||null}
const artifactDefinitions={
 artifact_spring:{id:'artifact_spring',name:'Пружина',desc:'Гравитационный артефакт. Слегка снижает усталость при длительном переходе, но увеличивает радиационный фон.',weight:.45,value:980,rarity:'обычный',effects:{staminaDrain:0.08,radiation:0.025}},
 artifact_battery:{id:'artifact_battery',name:'Батарейка',desc:'Электрический артефакт. Улучшает восстановление выносливости, но даёт небольшой радиационный фон.',weight:.35,value:1450,rarity:'необычный',effects:{staminaRegen:0.12,radiation:0.035}},
 artifact_shell:{id:'artifact_shell',name:'Ракушка',desc:'Плотный гравитационный артефакт. Немного усиливает защиту от внешнего воздействия.',weight:.8,value:1650,rarity:'необычный',effects:{damageReduction:2,radiation:0.04}},
 artifact_bubble:{id:'artifact_bubble',name:'Пузырь',desc:'Редкий химический артефакт. Повышает устойчивость к радиации, но немного замедляет восстановление сил.',weight:.9,value:2850,rarity:'редкий',effects:{radiationProtection:0.12,staminaDrain:0.04}},
 artifact_firefly:{id:'artifact_firefly',name:'Светляк',desc:'Редкий энергетический артефакт. Помогает восстановлению здоровья во время отдыха.',weight:.55,value:3400,rarity:'редкий',effects:{restHealing:0.18,radiation:0.05}},
 artifact_kolobok:{id:'artifact_kolobok',name:'Колобок',desc:'Органический артефакт с выраженными защитными свойствами. Повышает устойчивость к истощению.',weight:1.05,value:3900,rarity:'редкий',effects:{staminaDrain:0.14,radiation:0.07}},
 artifact_compass:{id:'artifact_compass',name:'Компас',desc:'Чрезвычайно редкий артефакт. Уменьшает утомление в пути и почти не даёт радиационного фона.',weight:.65,value:7800,rarity:'очень редкий',effects:{staminaDrain:0.18,radiation:0.01}}
};
function equippedArtifact(){return (g.items||[]).find(x=>x.type==='Артефакт'&&x.name===g.equipment?.artifact)||null;}
function artifactEffect(key){const item=equippedArtifact();return Number(item?.effects?.[key]||0);}

function realClock(){const now=new Date();if(!Number.isFinite(Number(g.realTimeStartedAt))||Number(g.realTimeStartedAt)<=0)g.realTimeStartedAt=Date.now();const elapsed=Math.max(0,Date.now()-Number(g.realTimeStartedAt));const day=1+Math.floor(elapsed/86400000);const hh=String(now.getHours()).padStart(2,"0"),mm=String(now.getMinutes()).padStart(2,"0");g.day=day;g.hour=now.getHours();return {day,time:`${hh}:${mm}`,stamp:`День ${day} · ${hh}:${mm}`};}
const encyclopediaEntries={
 mutants:[
  ["Плоть","Мутант","Относительно медлительное стадное животное. Часто держится возле открытых пространств."],["Псевдособака","Мутант","Хищник, охотящийся стаями. Следы чаще замечают на окраинах секторов."],["Кабан","Мутант","Крупное и опасное животное. Может защищать территорию и бросаться на нарушителя."],["Снорк","Мутант","Подвижный мутант, встречающийся в заброшенных комплексах и руинах."],["Контролёр","Мутант","Редкая опасная форма жизни. Сталкеры советуют не приближаться и не задерживаться на открытом месте."],["Зомбированный сталкер","Мутант","Бывший человек, утративший волю и способность к осмысленному общению. Держится в заброшенных местах и иногда собирается в небольшие группы."],["Кровосос","Мутант","Опасный хищник, предпочитающий укрытия и тёмные участки. Сведения о встречах часто противоречивы."],["Псевдогигант","Мутант","Крайне опасное крупное существо. Встречи с ним обычно заканчиваются отступлением."],["Тушкан","Мутант","Мелкий стайный мутант. Поодиночке не слишком опасен, но стая может застать врасплох."]
 ],
 armor:[["Кожаная куртка с пластинами","Броня","Лёгкий комплект с базовой защитой. Подходит для первых вылазок."],["Комбинезон сталкера М-2","Броня","Универсальная полевая защита для опытного одиночки."],["Заря","Броня","Усиленный комбинезон для опасных маршрутов."],["СЕВА","Броня","Герметичный научно-полевой костюм с повышенной защитой."],["Булат","Броня","Тяжёлый бронекостюм для сложных боевых выходов."],["Экзоскелет","Броня","Тяжёлая силовая система с максимальной защитой в каталоге."],["ПСЗ-9д «Долг»","Долг","Фракционный защитный костюм группировки Долг."],["Ветер свободы","Свобода","Лёгкий костюм, ассоциируемый с группировкой Свобода."],["Куртка бандита","Бандиты","Недорогая одежда с простыми защитными вставками."],["Армейский бронекостюм","Военные","Тяжёлая защитная экипировка военного образца."],["ССП-99","Учёные","Научный защитный костюм для работы в опасной среде."],["Костюм наёмника","Наёмники","Универсальный полевой комплект контрактника."],["Костюм Монолита","Монолит","Усиленный защитный комплект закрытой группировки."],["CS-1","Чистое небо","Фракционная полевая броня группировки Чистое небо."],["Болотный комбинезон ренегата","Ренегаты","Авторский комплект для болотных троп."],["Комбинезон «Заря» (полевой вариант)","Броня","Лёгкий полевой комплект с умеренной защитой."],["Бронекостюм «Берилл-5М»","Броня","Тяжёлый защитный комплект с акцентом на физическую защиту."],["«Страж свободы»","Свобода","Усиленный комплект группировки Свобода."],["Бронекостюм Чистого Неба CS-3a","Чистое небо","Тяжёлый комплект исследовательской группировки."],["Универсальная защита ПС5-М","Броня","Универсальный защитный комплект для разных условий."],
["ПСЗ-7 «Ветеран»","Долг","Облегчённый комплект Долга для патрулей и длительных переходов."],
["Броня «Защитник»","Долг","Усиленный вариант экипировки Долга для опытных бойцов."],
["Комбинезон «Свободный ветер»","Свобода","Лёгкий полевой вариант экипировки Свободы."],
["Костюм «Странник»","Свобода","Комплект Свободы для исследователей и разведчиков Зоны."],
["Комплект «Страж периметра»","Военные","Служебный комплект для гарнизонных подразделений."],
["Бронекостюм «Кордон-М»","Военные","Усиленная полевая экипировка военного образца."],
["Костюм «Контракт»","Наёмники","Неприметный комплект контрактника для работы в разных секторах."],
["Броня «Синий легион»","Наёмники","Усиленный вариант экипировки наёмников."],
["Комбинезон «Лазурь»","Чистое небо","Лёгкая экипировка для исследовательских вылазок."],
["Костюм «Туман»","Одиночки","Полевой комплект для дальних переходов."],
["Костюм «Сектант»","Монолит","Усиленный комплект бойца Монолита."],
["Куртка «Сборщик»","Бандиты","Практичная одежда для обитателей Свалки."],
["Комбинезон «Топь»","Ренегаты","Лёгкий комплект для болотных районов."],
["Костюм «Экспедиция»","Учёные","Полевой комплект исследовательской группы."]],
 artifacts:[["Медуза","Артефакт","Часто встречающаяся находка. Исследователи отмечают необычные свойства материала."],["Каменный цветок","Артефакт","Редкая находка из аномальных полей. Требует осторожной транспортировки."],["Пустышка","Артефакт","Небольшой объект с нестабильными показателями. Ценность зависит от состояния."],["Ломоть мяса","Артефакт","Органический артефакт неизвестного происхождения. Интересен полевым учёным."],["Вспышка","Артефакт","Объект с выраженной энергетической активностью. Не держи рядом с повреждённым оборудованием."],["Ночная звезда","Артефакт","Редкий артефакт с высокой рыночной стоимостью."],["Душа","Артефакт","Органическая находка, которую изучают полевые исследователи."],["Золотая рыбка","Артефакт","Редкий объект с необычной структурой и высокой ценностью."],["Пружина","Артефакт","Небольшой артефакт, часто встречающийся в опасных полях."],["Грави","Артефакт","Артефакт с выраженными физическими аномалиями."],["Пружина","Артефакт","Гравитационный артефакт, немного снижающий усталость."],["Батарейка","Артефакт","Электрический артефакт, улучшающий восстановление сил."],["Ракушка","Артефакт","Плотный гравитационный артефакт с защитными свойствами."],["Пузырь","Артефакт","Химический артефакт с повышенной устойчивостью к радиации."],["Светляк","Артефакт","Энергетический артефакт, помогающий восстановлению здоровья."],["Колобок","Артефакт","Органический артефакт с защитными свойствами."],["Компас","Артефакт","Очень редкая находка, снижающая утомление в пути."]]
};

const anomalyDossiers=[
 ['Жарка','Термическая','Невидимое поле перегретого воздуха. Первые признаки — марево, запах озона и обугленные пятна на земле. Болты помогают проверить коридор, но не гарантируют безопасность.','Опасность: высокая · Артефакты: термические и энергетические'],
 ['Электра','Электрическая','Скопление разрядов, часто заметное по голубоватым вспышкам и потрескиванию. Особенно опасна во влажную погоду и рядом с металлическими конструкциями.','Опасность: высокая · Артефакты: электрические'],
 ['Воронка','Гравитационная','Локальное искажение пространства. Может притягивать предметы и резко менять направление движения. Не подходи к центру без проверки пути.','Опасность: критическая · Артефакты: гравитационные'],
 ['Карусель','Гравитационная','Поле с вращающимся потоком обломков. Следы часто остаются на открытых площадках и в низинах. Радиус воздействия трудно определить визуально.','Опасность: критическая · Артефакты: гравитационные'],
 ['Кисель','Химическая','Едкая аномальная жидкость или туман, повреждающий снаряжение и организм. Следы — разъеденные поверхности и резкий химический запах.','Опасность: высокая · Артефакты: химические'],
 ['Газировка','Химическая','Пузырящееся поле с нестабильными выбросами. Может выглядеть безобидно, пока не нарушена поверхность. Не проверяй неизвестную лужу без дистанции.','Опасность: средняя/высокая · Артефакты: химические'],
 ['Трамплин','Гравитационная','Невидимый импульсный выброс, способный отбросить человека или предмет. Чаще встречается на тропах, в высокой траве и у разрушенных дорог.','Опасность: высокая · Артефакты: гравитационные'],
 ['Мясорубка','Гравитационная','Многоступенчатое поле с резкими перемещениями обломков. Опасная зона может быть шире видимого следа. Обходи по проверенному маршруту.','Опасность: критическая · Артефакты: гравитационные'],
 ['Пепелище','Термическая','Участок с остаточным тепловым излучением и внезапными вспышками. После выбросов активность может усиливаться.','Опасность: высокая · Артефакты: термические'],
 ['Ржавый волос','Химическая','Тонкие нити едкого вещества, почти незаметные в сумерках. Контакт может повредить одежду и кожу. Осматривай проход фонарём с безопасного расстояния.','Опасность: высокая · Артефакты: химические'],
 ['Пузырь','Неизвестная','Полупрозрачная оболочка с нестабильным давлением. При приближении может менять форму и выбрасывать содержимое. Не трогай руками.','Опасность: неизвестная · Артефакты: редкие'],
 ['Пси-поле','Психотропная','Зона воздействия на восприятие и нервную систему. Возможны дезориентация, ложные звуки и потеря контроля над движением.','Опасность: критическая · Требуется защита'],
 ['Радиационное поле','Радиационная','Ионизирующее излучение накапливается при длительном пребывании в заражённом секторе. Дозиметр показывает уровень, антирад снижает накопленную дозу, а защитный костюм замедляет заражение.','Опасность: зависит от сектора · Используй антирад и защитную экипировку']
];
const encyclopediaLong={
 'Одиночки':'Разрозненное сообщество независимых исследователей, проводников и охотников за артефактами. Их сила — в знании местности и личных договорённостях. Отряды часто объединяются на время перехода, сопровождения или поиска пропавших. Нейтралитет не означает безопасности: отношение зависит от репутации и конкретных поступков.',
 'Долг':'Организованная группировка с дисциплиной, внутренней иерархией и жёстким отношением к угрозам Зоны. Участники охраняют укреплённые позиции, сопровождают исследовательские группы и стремятся ограничить распространение аномальной опасности. Их методы вызывают споры даже среди опытных сталкеров.',
 'Свобода':'Группировка, выступающая за свободное исследование Зоны и доступ к её тайнам. В её рядах встречаются разведчики, охотники и специалисты по аномалиям. Отношения с другими фракциями зависят от контроля над маршрутами, снабжения и старых конфликтов.',
 'Бандиты':'Разношерстные группы, для которых контроль проходов и нажива часто важнее правил. Одни промышляют грабежом, другие торгуют информацией и нелегальными поставками. Договариваться можно, но любое соглашение требует осторожности.',
 'Военные':'Силы периметра и гарнизоны, пытающиеся контролировать доступ в опасные районы. Их присутствие связано с блокпостами, патрулями и проверками. Отношение к сталкерам меняется в зависимости от приказов, обстановки и конкретного командира.'
};

const encyclopediaSystem=window.ZoneEncyclopedia.createEncyclopediaSystem({
 getState:()=>g,
 getEntries:()=>encyclopediaEntries,
 getAnomalyDossiers:()=>anomalyDossiers,
 getWeaponCatalogue:()=>weaponCatalogue,
 getArtifactDefinitions:()=>artifactDefinitions,
 weaponGlyph,
 locationName,
 escapeHtml,
 $
});
function armoryCatalog(){return encyclopediaSystem.armoryCatalog()}
function renderArmory(){encyclopediaSystem.renderArmory()}
function encyclopediaBase(){return encyclopediaSystem.encyclopediaBase()}
function selectEncyclopediaEntry(id){encyclopediaSystem.selectEncyclopediaEntry(id)}
function toggleEncyclopediaGroup(id){encyclopediaSystem.toggleEncyclopediaGroup(id)}
function setEncyclopediaMode(mode){encyclopediaSystem.setEncyclopediaMode(mode)}
function renderEncyclopedia(){encyclopediaSystem.renderEncyclopedia()}
function save(){window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);render();if($("trade")?.classList.contains("active"))renderTrade()}
function log(t){g.log.unshift(t);g.log=g.log.slice(0,35)}
function news(t,b){const c=realClock();g.news.unshift({day:c.day,hour:c.time,title:t,body:b});g.news=g.news.slice(0,40);if($('world')?.classList.contains('active'))renderMapIntel()}
function addItem(id,name,type,desc,weight,value,qty=1){return window.ZoneInventory.add(g.items,id,name,type,desc,weight,value,qty)}
function count(id){return window.ZoneInventory.count(g.items,id)}
function take(id,n){return window.ZoneInventory.take(g.items,id,n)}
function cleanPlayerCallsign(value){return String(value??'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,24);}
function playerDisplayName(){const realName=String(g.realName||'').trim(),callsign=cleanPlayerCallsign(g.name)||'Сталкер';return realName&&realName.toLocaleLowerCase('ru-RU')!==callsign.toLocaleLowerCase('ru-RU')?`${realName} ${callsign}`:callsign;}
function leaveMapFullscreenForView(){const frame=$('zoneMapFrame');if(!frame)return;if(document.fullscreenElement===frame){try{const exit=document.exitFullscreen?.();exit?.catch?.(error=>console.warn('Не удалось закрыть полноэкранную карту:',error));}catch(error){console.warn('Не удалось закрыть полноэкранную карту:',error);}}frame.classList.remove('map-fullscreen-fallback');}
function view(id){if(id!=='world')leaveMapFullscreenForView();if(id==='radio'&&zoneSocket?.connected)zoneSocket.emit('radio:state');if(id!=="people"&&$("npcDialogueOverlay")?.classList.contains("open"))closeTalk();document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));document.querySelectorAll("[data-v]").forEach(b=>b.classList.toggle("active",b.dataset.v===id));document.querySelector("main>aside.panel")?.classList.remove("mobile-open");if(id==="war")renderWar();if(id==="encyclopedia"){setEncyclopediaMode("knowledge");renderEncyclopedia();}if(id==="stories")renderStories();if(id==="people")renderPeople();if(id==="zoneReports")renderZoneReports();if(id==="squads")renderSquads();if(id==="profile")renderProfile();if(id==="inventory")renderInventory();if(id==="trade"){renderTrade();renderPlayerTrade();}if(id==="settings")applyGameOptions();if(id==="world")renderMap();if(id==="ranks"){renderStalkerLeaderboard()}if(id==="factions"){renderFactions();renderFactionLeaderboard();renderDiplomacy()}}
function toggleMobileMenu(){document.querySelector("main>aside.panel")?.classList.toggle("mobile-open")}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("npcDialogueOverlay")?.classList.contains("open"))closeTalk();});
document.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{view(b.dataset.v);if(b.dataset.v==="inventory")renderInventory()});
document.querySelectorAll("[data-gear]").forEach(b=>b.addEventListener("click",()=>openGearSlot(b.dataset.gear)));

function localLeaderboardFallback(){
 const roster=(serverWorld?.npcState?Object.values(serverWorld.npcState):(g.npcs||[])).filter(n=>n&&n.name);
 const rows=roster.map((n,i)=>({id:`npc:${n.id||i}`,type:'npc',name:n.name,faction:n.faction||'Одиночки',role:n.role||'сталкер',location:n.location||g.loc,kills:Number(n.combatKills)||0,deaths:Number(n.combatDeaths)||0,score:100+(Number(n.combatKills)||0)*125+Math.max(0,20-i),place:0}));
 rows.push({id:`player:${zonePlayerId||'local'}`,type:'player',playerId:zonePlayerId||'local',name:g.name||'Ты',faction:g.faction||'Одиночки',role:'сталкер',location:g.loc,kills:Number(g.careerStats?.kills)||0,deaths:0,score:100+(Number(g.careerStats?.kills)||0)*150+Math.min(500,Math.floor((Number(g.xp)||0)/10)),place:0});
 rows.sort((a,b)=>b.score-a.score||b.kills-a.kills||a.name.localeCompare(b.name,'ru'));return rows.slice(0,20).map((x,i)=>({...x,place:i+1}));
}
function rankLabel(row){if(row.place===1)return 'Легенда Зоны';if(row.place<=3&&row.place>0)return 'Элита Зоны';if(row.place<=10&&row.place>0)return 'Ветеран Зоны';const score=Number(row.score)||0;return score>=1800?'Легенда':score>=1200?'Мастер':score>=800?'Ветеран':score>=450?'Опытный':score>=200?'Боец':'Новичок'}
function renderStalkerLeaderboard(){
 const list=$('stalkerLeaderboard');if(!list)return;
 const rows=serverLeaderboard.length?serverLeaderboard:localLeaderboardFallback();
 if(!rows.some(x=>x.id===selectedRankId))selectedRankId=rows[0]?.id||'';
 list.innerHTML=rows.map(row=>`<button class="pda-rank-row ${row.id===selectedRankId?'selected':''}" onclick="selectRankEntry('${String(row.id).replace(/[^a-zA-Z0-9:_-]/g,'')}')"><span class="rank-place">${row.place||'—'}.</span><span class="rank-name">${escapeHtml(row.name)}</span><span class="rank-score">${Number(row.score||0).toLocaleString('ru-RU')}</span></button>`).join('')||'<div class="mutedbox small">Рейтинг пока пуст.</div>';
 const chosen=rows.find(x=>x.id===selectedRankId)||rows[0];
 if(chosen){$('rankDetailTitle').textContent=chosen.name;$('rankDetail').innerHTML=`<div class="rank-detail-top">${portraitMarkup({id:chosen.id,name:chosen.name,faction:chosen.faction,role:chosen.role||'сталкер'},true)}<div><b>${escapeHtml(chosen.name)}</b><div class="desc">${escapeHtml(chosen.role||'сталкер')} · ${escapeHtml(chosen.faction||'Одиночки')}</div><span class="tag">${rankLabel(chosen)}</span></div></div><div class="rank-detail-grid"><div><small>Место</small><b>№ ${chosen.place||'—'}</b></div><div><small>Очки</small><b>${Number(chosen.score||0).toLocaleString('ru-RU')}</b></div><div><small>Победы</small><b>${Number(chosen.kills||0)}</b></div><div><small>Поражения</small><b>${Number(chosen.deaths||0)}</b></div><div><small>Локация</small><b>${escapeHtml(locationName(chosen.location)||chosen.location||'—')}</b></div><div><small>Тип записи</small><b>${chosen.type==='player'?'Игрок':'Персонаж Зоны'}</b></div></div><div class="rank-detail-note">${chosen.lastVictim?`Последняя победа: ${escapeHtml(chosen.lastVictim)}`:'Рейтинг обновляется после боевых событий и активности в Зоне.'}${chosen.achievements?.length?`<div class="desc" style="margin-top:8px">Достижения: ${chosen.achievements.map(escapeHtml).join(' · ')}</div>`:''}</div>`;}
 const me=rows.find(x=>x.playerId===zonePlayerId||x.id===`player:${zonePlayerId||'local'}`);$('rankMyPosition').textContent=me?`ТВОЁ МЕСТО: ${me.place}`:'ТВОЁ МЕСТО: ВНЕ ТОП-20';$('rankUpdated').textContent=`ОБНОВЛЕНО ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}`;$('rankClock').textContent=realClock().time+'  '+realClock().stamp;
 $('rankSummary').innerHTML=[['Участников в рейтинге',rows.length],['Твоя статистика',Number(g.careerStats?.kills)||0],['Текущий рейтинг',me?Number(me.score).toLocaleString('ru-RU'):'—']].map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 $('rankRecent').innerHTML=rankRecentEvents.slice(0,6).map(e=>`<div class="item block"><b>${escapeHtml(e.name||'Сталкер')}</b><div class="desc">${escapeHtml(e.text||'Позиция в рейтинге обновлена')}</div></div>`).join('')||'<div class="mutedbox small">Новых изменений пока нет.</div>';
 const hall=window.zoneHallOfFame||[];const hallEl=$('rankHallOfFame');if(hallEl)hallEl.innerHTML=hall.slice(0,8).map(x=>`<div class="item block"><b>${escapeHtml(x.name)}</b><div class="desc">${escapeHtml(x.faction||'Неизвестно')} · ${escapeHtml(x.cause||'Погиб в Зоне')}</div></div>`).join('')||'<div class="mutedbox small">Пока нет павших легенд.</div>';
 const achievements=chosen?.achievements||me?.achievements||[];const achEl=$('rankAchievements');if(achEl)achEl.innerHTML=achievements.map(x=>`<div class="item block">✦ ${escapeHtml(x)}</div>`).join('')||'<div class="mutedbox small">Продолжай исследовать Зону, выполнять задания и побеждать.</div>';
 const newsEl=$('rankNews');if(newsEl)newsEl.innerHTML=(window.zoneStalkerNews||[]).slice(0,8).map(x=>`<div class="item block"><b>${escapeHtml(x.name||'Зона')}</b><div class="desc">${escapeHtml(x.text||'')}</div></div>`).join('')||'<div class="mutedbox small">Пока тихо. Зона живёт своей жизнью.</div>';
}

const factionEmblems={
 'Одиночки':'loners.svg','Долг':'duty.svg','Свобода':'freedom.svg','Бандиты':'bandits.svg','Военные':'military.svg','Учёные':'scientists.svg','Наёмники':'mercenaries.svg','Монолит':'monolith.svg','Чистое небо':'clear-sky.svg'
};
let selectedFactionRank='';
function factionRelationValue(a,b){return window.ZoneFactionRelations.relationValue(a,b,g.diplomacy,g.factions);}
function factionRankRows(){
 const factions=g.factions||[], roster=serverWorld?.npcState?Object.values(serverWorld.npcState):(g.npcs||[]);
 return window.ZoneFactionRanking.buildRows({factions,roster,patrols:g.patrols||[],locations:g.locations||[],factionStats:g.factionStats||{},relationValue:factionRelationValue});
}
function factionEmblemMarkup(f){const file=factionEmblems[f.name];return file?`<img class="faction-emblem" src="/assets/factions/${file}" alt="Эмблема ${escapeHtml(f.name)}" loading="lazy">`:`<span class="faction-emblem-fallback">${escapeHtml(f.icon||'◈')}</span>`;}
function renderFactionLeaderboard(){
 const el=$('factionLeaderboard');if(!el)return;
 const rows=factionRankRows();if(!rows.some(x=>x.name===selectedFactionRank))selectedFactionRank=rows[0]?.name||'';
 el.innerHTML=rows.map(f=>{
  const cells=Array.from({length:18},(_,i)=>{const r=f.relations[i]||null;let cls='neutral';if(r?.value<=-20)cls='enemy';else if(r?.value>=20)cls='friend';else if(r)cls='tense';return `<i class="faction-rel-cell ${cls}" title="${r?`${escapeHtml(r.name)}: ${r.value>0?'+':''}${Math.round(r.value)}`:'Нет данных'}"></i>`}).join('');
  const move=f.place===1?'▲':f.place<=3?'◆':'•';
  return `<button class="faction-rank-row ${selectedFactionRank===f.name?'selected':''}" onclick="selectFactionRank('${String(f.name).replace(/\\/g,'').replace(/'/g,"\\'")}')"><div class="faction-rank-main"><span class="faction-rank-place">${f.place}</span><span class="faction-rank-trend ${f.place<=3?'up':''}">${move}</span><div class="faction-rank-nameblock"><b>«${escapeHtml(f.name)}»</b><small>Местонахождение: <strong>${escapeHtml(f.baseName)}</strong></small><small>Сила группировки: <strong>${f.score.toLocaleString('ru-RU')}</strong></small></div></div><div class="faction-relations"><div class="faction-rel-cells">${cells}</div><div class="faction-rel-labels"><span>Враги</span><span>Нейтральные</span><span>Друзья</span></div></div><div class="faction-rank-emblem">${factionEmblemMarkup(f)}</div></button>`;
 }).join('')||'<div class="mutedbox small">Нет данных о группировках.</div>';
 const selected=rows.find(x=>x.name===selectedFactionRank);
 const detail=$('factionRankDetail');if(detail&&selected){detail.innerHTML=`<div class="faction-detail-emblem">${factionEmblemMarkup(selected)}</div><div class="faction-detail-copy"><b>«${escapeHtml(selected.name)}»</b><span>${escapeHtml(selected.style||'Группировка Зоны')}</span></div><div class="faction-detail-stats"><span>Место <b>№ ${selected.place}</b></span><span>Очки силы <b>${selected.score.toLocaleString('ru-RU')}</b></span><span>Численность <b>${selected.members.toLocaleString('ru-RU')}</b></span><span>Влияние <b>${selected.influence}</b></span><span>Территории <b>${selected.territoryCount}</b></span><span>Патрули <b>${selected.patrols}</b></span></div>`;}
 $('factionRankUpdated').textContent=`ОБНОВЛЕНО ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}`;$('factionRankCount').textContent=`${rows.length} ГРУППИРОВОК`;
}
function selectFactionRank(name){selectedFactionRank=name;renderFactionLeaderboard()}

function selectRankEntry(id){selectedRankId=id;renderStalkerLeaderboard()}
function applyLeaderboard(data){if(Array.isArray(data))serverLeaderboard=data.slice(0,20);else if(data&&typeof data==='object'){serverLeaderboard=Array.isArray(data.entries)?data.entries.slice(0,20):serverLeaderboard;window.zoneHallOfFame=Array.isArray(data.hallOfFame)?data.hallOfFame:window.zoneHallOfFame;window.zoneStalkerNews=Array.isArray(data.news)?data.news:window.zoneStalkerNews;}if($('ranks')?.classList.contains('active'))renderStalkerLeaderboard();}
function renderStories(){if(window.ZoneStories&&$('storyList'))$('storyList').innerHTML=window.ZoneStories.render(g)}
function chooseStory(id){if(!window.ZoneStories)return;const result=window.ZoneStories.choose(g,id);if(result.message){log(result.message);news(result.ok?'Личное дело':'Сведения по делу',result.message)}save();renderStories()}
function here(){return g.locations.find(l=>l.id===g.loc)}
function npcBy(id){return (g.npcs||[]).find(n=>n.id===id)||serverWorld?.npcState?.[id]||null}
function nearbyNpcs(){syncNpcRosterToClient();return here().people.map(npcBy).filter(Boolean)}
function addQuest(id){let q=g.quests.find(q=>q.id===id);if(q&&!q.accepted&&!q.done){q.accepted=true;log("Получено задание: "+q.title);news("Новое задание",q.title+" — "+q.desc)}}
const npcDialogueView=window.ZoneNpcDialogueView.create({getElement:$,document,portraitMarkup,playerDisplayName,getGameState:()=>g,escapeHtml});
function restoreNpcDialogueOverlay(){npcDialogueView.restoreOverlay()}
function showNpcDialogue(){npcDialogueView.showOverlay()}
function dialogueTarget(){return $('dialogueBox')}
function meet(id){let n=npcBy(id);if(!n||n.loc!==g.loc)return;if(!npcInInteractionRange(n))return alert('Подойди ближе к NPC. Радиус взаимодействия — 8 м.');activeNpc=id;g.meetings++;
log("Встреча: "+n.name+".");view("people");renderPeople();startTalk(id);save()}

function renderCopDialogue(n, message, choices){npcDialogueView.render(n,message,choices)}
function startTalk(id){
 let n=npcBy(id);if(!n)return;if(!npcInInteractionRange(n))return alert('Ты слишком далеко. Чтобы поговорить, подойди на расстояние 8 м.');
 const hasSignature=applySignatureDialogue(n);
 if(!hasSignature)generatedNpcDialogue(n);
 const live=serverWorld?.npcState?.[id];
 if(live?.dialogue && !hasSignature){
  n.greeting=live.dialogue.greeting||n.greeting||NPC_DIALOGUE_TEMPLATES.get(id)?.greeting;
  const serverTopics=Array.isArray(live.dialogue.topics)?live.dialogue.topics.filter(t=>Array.isArray(t)&&t.length>=2):[];
  const savedTopics=NPC_DIALOGUE_TEMPLATES.get(id)?.topics||[];
  // Preserve authored character-specific dialogue when an older/partial server save has no topics.
  n.topics=serverTopics.length?serverTopics:savedTopics;
 }
 if(!Array.isArray(n.topics)||!n.topics.length){const fallback=NPC_DIALOGUE_TEMPLATES.get(id);n.topics=clone(fallback?.topics||[['Что нового?','Сейчас в округе тихо. Будь осторожен и проверяй маршрут перед выходом.']]);}
 activeNpc=id;
 const storyMeet={lebedev:["metLebedev","story_swamp_signal"],novikov:["metNovikov","story_swamp_relay"],prof:["metSakharov","story_yantar_echo"],beard:["metBeard","story_north_route"],archivist:["metArchivist","story_pripyat_archive"]};
 if(storyMeet[id]){g.storyFlags[storyMeet[id][0]]=true;addQuest(storyMeet[id][1]);}
 showNpcDialogue();
 renderCopDialogue(n,n.greeting||'Сталкер внимательно смотрит на тебя.',n.topics||[]);
 renderQuick();
}
const npcDialogueActions=window.ZoneNpcDialogueActions.create({
 npcBy, npcInInteractionRange, isSocketConnected:()=>!!zoneSocket?.connected,
 setIgnoredInteractionReplyFor:id=>{ignoreNpcInteractionReplyFor=id;},
 emitTopic:(id,index)=>zoneSocket.emit("npc:interact",{npcId:id,action:"topic",topicIndex:index}),
 addQuest, setFlag:(key,value)=>{g.flags[key]=value;}, renderDialogue:renderCopDialogue,
 getElement:$, escapeHtml, alert:message=>window.alert(message), log, save
});
function topic(id,i){return npcDialogueActions.topic(id,i)}
function closeTalk(){activeNpc=null;npcDialogueView.closeOverlay();renderQuick()}

let activePlayerDM=null, playerDMHistory={};
function openPlayerDM(id){const p=onlinePlayers.find(x=>x.id===id);if(!p||p.location!==g.loc)return alert('Игрок должен находиться в этой локации.');activePlayerDM=id;zoneSocket?.emit('dm:history',{targetId:id});renderPlayerDM();}
function renderPlayerDM(){const el=$('playerDmPanel');if(!el)return;const target=onlinePlayers.find(x=>x.id===activePlayerDM);if(!target){el.innerHTML='<div class="mutedbox">Выбери игрока в этой локации.</div>';return;}const msgs=playerDMHistory[activePlayerDM]||[];el.innerHTML=`<div class="dm-head"><b>Личный канал: ${escapeHtml(target.name)}</b><span class="tag">${escapeHtml(locationName(target.location))}</span></div><div class="dm-history" id="playerDmHistory">${msgs.map(m=>`<div class="dm-line ${m.fromId===zonePlayerId?'mine':''}"><b>${escapeHtml(m.fromName||'Сталкер')}</b><p>${escapeHtml(m.text)}</p><small>${new Date(m.time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</small></div>`).join('')||'<div class="mutedbox small">История сообщений пуста.</div>'}</div><div class="dm-compose"><input id="playerDmInput" maxlength="500" placeholder="Написать личное сообщение…" onkeydown="if(event.key==='Enter')sendPlayerDM()"><button onclick="sendPlayerDM()">Отправить</button></div>`;const h=$('playerDmHistory');if(h)h.scrollTop=h.scrollHeight;}
function sendPlayerDM(){const input=$('playerDmInput'),text=input?.value?.trim();if(!text||!activePlayerDM)return;if(!zoneSocket?.connected)return alert('Нет соединения с сервером.');zoneSocket.emit('dm:send',{targetId:activePlayerDM,text});input.value='';}

let npcApproachHistory=[];
function renderZoneReports(){
 const approach=$('npcApproachFeed');
 if(approach)approach.innerHTML=npcApproachHistory.length?npcApproachHistory.slice(0,15).map(a=>{const n=npcBy(a.npcId);return `<article class="npc-approach-card">${n?portraitMarkup(n):'<span class="npc-portrait">☻</span>'}<div><b>${escapeHtml(a.name||n?.name||'Сталкер')} ${a.name||n?.name?'обратился к тебе':''}</b><p>${escapeHtml(a.text||'Сталкер хочет поговорить.')}</p><small>${escapeHtml(a.location||locationName(a.locationId||g.loc))} · ${new Date(a.at||Date.now()).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</small>${n?`<button onclick="meet('${String(n.id).replace(/'/g,"\\'")}')">Поговорить</button>`:''}</div></article>`}).join(''):'<div class="mutedbox small">Пока никто не обращался к тебе. Встречи и инициативные разговоры появятся здесь.</div>';
 const memorial=(serverWorld?.npcMemorial||[]).slice(0,8).map(m=>`<div class="item"><b>☠ ${escapeHtml(m.name)}</b><div class="desc">Погиб: ${escapeHtml(m.cause)} · ${escapeHtml(locationName(m.location))}</div></div>`).join('');
 const rescues=(serverWorld?.rescueOperations||[]).slice(0,10).map(op=>`<div class="item"><b>${escapeHtml(op.status==='completed'?'✓ Спасение завершено':'✚ Операция спасения')} · ${escapeHtml(op.patientName||'Раненый сталкер')}</b><div class="desc">${escapeHtml(op.faction||'')} · ${escapeHtml(locationName(op.target))} → ${escapeHtml(locationName(op.rescueBase))} · ${escapeHtml(op.squadName||'Отряд')}</div></div>`).join('');
 const feed=$('peopleWorldFeed');if(feed)feed.innerHTML=(rescues+memorial)||'<div class="mutedbox small">Операции спасения и записи памяти появятся здесь по мере событий в Зоне.</div>';
 renderFactionCasualtyNotices();
}
let selectedContactNpcId=null;
function renderPeople(){
 syncNpcRosterToClient();
 const roster=nearbyNpcs(),q=($('peopleSearch')?.value||'').trim().toLowerCase();
 const filtered=roster.filter(n=>(n.name+' '+(n.faction||'')+' '+(n.role||'')+' '+(n.personality||'')).toLowerCase().includes(q));
 const count=$('peopleCount');if(count)count.textContent=`КОНТАКТЫ: ${filtered.length}`;
 const loc=$('peopleLocationLabel');if(loc)loc.textContent=locationName(g.loc).toUpperCase();
 if(!filtered.some(n=>n.id===selectedContactNpcId))selectedContactNpcId=filtered[0]?.id||null;
 const list=$('peopleList');
 if(list)list.innerHTML=filtered.map(n=>{
  const rel=Number(g.relationships?.[n.id]||n.relationships?.[zonePlayerId]||0),enemy=npcMarkerClass(n)==='marker-enemy';
  const state=n.alive===false?'погиб':(n.action||n.behavior||'в секторе');
  return `<button type="button" class="pda-contact-row ${selectedContactNpcId===n.id?'selected':''}" onclick="selectContactNpc('${String(n.id).replace(/'/g,"\\'")}')"><span class="pda-contact-status ${enemy?'enemy':''}"></span>${portraitMarkup(n)}<span class="pda-contact-main"><b>${escapeHtml(n.name)}</b><small>${escapeHtml(n.faction||'Одиночка')} · ${escapeHtml(n.role||'Сталкер')}</small><small class="pda-contact-meta">${escapeHtml(n.rank||n.title||'Новичок')} · ${escapeHtml(state)}</small></span><span class="pda-contact-relation ${rel<0?'negative':rel>0?'positive':''}">${rel>0?'+':''}${rel}</span></button>`;
 }).join('')||'<div class="pda-contact-empty">В этом секторе контактов не обнаружено.</div>';
 renderContactDetail();

}
function selectContactNpc(id){selectedContactNpcId=id;renderPeople();}
function renderContactDetail(){
 const el=$('peopleDetail'),title=$('peopleDetailTitle');if(!el)return;
 const n=nearbyNpcs().find(x=>x.id===selectedContactNpcId);
 if(!n){if(title)title.textContent='Досье контакта';el.innerHTML='<div class="pda-contact-empty">Выбери сталкера в списке слева, чтобы открыть его личное дело.</div>';return;}
 const rel=Number(g.relationships?.[n.id]||n.relationships?.[zonePlayerId]||0),enemy=npcMarkerClass(n)==='marker-enemy';
 const rank=n.rank||n.title||n.role||'Новичок',status=n.alive===false?'погиб':(n.action||n.behavior||'находится в секторе');
 if(title)title.textContent='ЛИЧНОЕ ДЕЛО / '+String(n.name).toUpperCase();
 const actionButtons=enemy?`<button class="battle-button" onclick="startNpcEncounter('${n.id}')">⚔ Тактическое взаимодействие</button><span class="tag">Враждебный контакт</span>`:`<button onclick="startTalk('${n.id}')">◉ Начать разговор</button><button onclick="npcServerAction('${n.id}','ask')">⌕ Спросить о слухах</button>${n.role==='медик'?`<button onclick="npcSpecialistAction('${n.id}')">✚ Медицинская помощь</button>`:n.role==='техник'?`<button onclick="npcSpecialistAction('${n.id}')">⚙ Ремонт снаряжения</button>`:''}<button onclick="openNpcTrade('${n.id}')">⇄ Торговля / снаряжение</button>`;
 el.innerHTML=`<div class="pda-contact-identity">${portraitMarkup(n,true)}<div><div class="eyebrow">${escapeHtml(n.faction||'ОДИНОЧКА')} / ${escapeHtml(rank)}</div><h2>${escapeHtml(n.name)}</h2><p>${escapeHtml(n.role||'Сталкер')} · ${escapeHtml(locationName(n.loc||n.location||g.loc))}</p><span class="pda-contact-state">● ${escapeHtml(status)}</span></div></div><div class="pda-contact-stats"><div><small>ЗДОРОВЬЕ</small><b>${Math.round(n.health??100)}%</b></div><div><small>МОРАЛЬ</small><b>${Math.round(n.morale??60)}%</b></div><div><small>ОТНОШЕНИЕ</small><b class="${rel<0?'negative':rel>0?'positive':''}">${rel>0?'+':''}${rel}</b></div><div><small>РАНГ</small><b>${escapeHtml(rank)}</b></div></div><div class="pda-contact-section"><b>ХАРАКТЕРИСТИКА</b><p>${escapeHtml(n.desc||n.personality||'Подробная информация отсутствует.')}</p></div><div class="pda-contact-section"><b>БИОГРАФИЯ</b><p>${escapeHtml(n.biography||'В КПК пока нет подробной биографии этого сталкера. Попробуй поговорить с ним, чтобы узнать больше.')}</p></div><div class="pda-contact-section"><b>СОЦИАЛЬНЫЕ СВЯЗИ</b><p>Друзья: ${(n.friends||[]).length} · Соперники: ${(n.rivals||[]).length} · Отношение к тебе: ${rel>0?'положительное':rel<0?'отрицательное':'нейтральное'}</p></div><div class="pda-contact-actions">${actionButtons}</div>`;
}

function openActiveNpcTrade(){
 const id=activeNpc;
 if(!id)return alert('Сначала выбери сталкера, с которым хочешь торговать.');
 closeTalk();view('people');openNpcTrade(id);
}
function openNpcTrade(id){
 const n=npcBy(id);if(!n||(n.loc||n.location)!==g.loc)return alert('Сталкер должен находиться в текущем секторе.');
 // The server performs the authoritative distance check for each trade action.
 activeNpc=id;
 const eq=n.equipment||serverWorld?.npcState?.[id]?.equipment||{};
 const role=(n.role||'').toLowerCase();
 const fallback={suit:role.includes('торгов')?'Куртка торговца':role.includes('учён')||role.includes('исслед')?'Научный комбинезон':'Комбинезон сталкера',weapon:role.includes('охот')?'ТОЗ-34':role.includes('развед')?'АКС-74У':'ПМ',tool:'Обычный детектор',backpack:'Полевой рюкзак'};
 const npcStock=serverWorld?.npcEconomy?.[id]?.stock||{};
 const canSellWeapons=['sid','barman','scout','prof','scientist','beard'].includes(id)||role.includes('торгов');
 // Server-side NPC accounts start with ordinary supplies for every living NPC; only weapons are trader-restricted.
 const stock=tradeGoods().filter(x=>['Медицина','Еда','Артефакт','Броня','Инструмент','Оружие','Материал'].includes(x[2])&&(x[2]!=='Оружие'||canSellWeapons)&&Number(npcStock[x[1]]??(x[2]==='Оружие'?(canSellWeapons?5:0):5))>0);
 const npcBalance=Number(serverWorld?.npcEconomy?.[id]?.balance??(canSellWeapons?250000:5000));
 const canSellIntel=['sid','barman','beard','scout','prof','guide','wolfhound','scientist'].includes(id)||role.includes('торгов');
 let panel=$('npcTradePanel');if(!panel){panel=document.createElement('div');panel.id='npcTradePanel';panel.className='npc-trade-panel';$('peopleList').appendChild(panel);}
 panel.innerHTML=`<div class="npc-trade-window"><div class="npc-trade-title"><b>Полевой обмен — ${escapeHtml(n.name)}</b><span class="tag">${escapeHtml(n.role||'Сталкер')}</span></div><div class="npc-equipment"><b>Снаряжение сталкера</b><div class="npc-equipment-grid">${[['Костюм',eq.suit||n.suit||fallback.suit],['Оружие',eq.weapon||n.weapon||fallback.weapon],['Детектор',eq.detector||eq.tool||fallback.tool],['Рюкзак',eq.backpack||fallback.backpack]].map(x=>`<div><small>${x[0]}</small><b>${escapeHtml(x[1])}</b></div>`).join('')}</div></div><b>Предложение ${canSellWeapons?'торговца':'сталкера'}</b><div class="small muted">Касса NPC: ${npcBalance.toLocaleString('ru-RU')} ₽ · ассортимент и деньги принадлежат этому персонажу</div><div class="npc-stock">${stock.map(x=>`<div class="npc-stock-row"><span><b>${escapeHtml(x[0])}</b><small>${escapeHtml(x[2])} · ${x[3]} ₽ · запас ${Number(npcStock[x[1]]??5)}</small></span><button onclick="npcBuy('${escapeHtml(id)}','${escapeHtml(x[1])}')">Купить</button></div>`).join('')||'<small>У этого сталкера сейчас нет товаров.</small>'}</div><b>Продать сталкеру</b><div class="npc-stock">${g.items.filter(x=>x.qty>0).slice(0,10).map(x=>`<div class="npc-stock-row"><span><b>${escapeHtml(x.name)}</b><small>${x.qty} шт. · ориентир ${Math.floor(x.value*.5)} ₽</small></span><button onclick="npcSell('${escapeHtml(id)}','${escapeHtml(x.id)}')">Продать</button></div>`).join('')||'<small>В рюкзаке нет вещей для продажи.</small>'}</div>${canSellIntel?`<div class="section">Информация о тайниках</div><p class="small muted">Проверенные информаторы продают координаты нетронутых тайников в этом секторе. Цена — от 22 000 ₽.</p><button onclick="buyStashIntel('${escapeHtml(id)}')">Купить координаты тайника</button>`:''}<button class="quiet-action" onclick="closeNpcTrade()">Закрыть обмен</button></div>`;
 panel.scrollIntoView?.({behavior:'smooth',block:'nearest'});
}
function closeNpcTrade(){const p=$('npcTradePanel');if(p)p.innerHTML='';}
function npcBuy(npcId,item){if(zoneSocket?.connected){zoneSocket.emit('npc:trade:buy',{npcId,item});return;}alert('Для безопасной торговли с NPC подключись к серверу.');}
function npcSell(npcId,item){if(zoneSocket?.connected){zoneSocket.emit('npc:trade:sell',{npcId,item,qty:1});return;}alert('Для безопасной торговли с NPC подключись к серверу.');}

function portraitMarkup(n,large=false){
 const seed=String(n.id||n.name||'npc').split('').reduce((a,c)=>((a*31)+c.charCodeAt(0))>>>0,7),portrait=(seed%16)+1,src=`/assets/portraits/stalker-${String(portrait).padStart(2,'0')}.webp`;
 return `<div class="npc-portrait ${large?'portrait-xl':''}" style="--portrait-hue:${seed%360}"><img src="${src}" alt="Портрет ${escapeHtml(n.name||'сталкера')}" loading="lazy"><span class="portrait-faction">${factionIconMarkup(n.faction)}</span></div>`;
}
function returnToTitleScreen(){
 if(!g.characterCreated)return openTitleScreen();
 save();
 closeTalk?.();
 $('combatOverlay')?.classList.remove('show');
 $('characterSetup')?.classList.remove('show');
 closeTitleOptions();
 openTitleScreen();
}
// Legacy entry point now returns to the actual title screen instead of opening the old quick-access popup.
function openMainMenu(){returnToTitleScreen();}
function closeMainMenu(){closeTitleOptions();}
function menuGo(id){view(id);render();}
function applyGameOptions(){
 const o=g.options||{},classes={largeText:'large-text',reduceMotion:'reduce-motion',compactUI:'compact-ui',highContrast:'high-contrast',largeControls:'large-controls',reduceBackground:'reduce-background'};
 for(const [key,cls] of Object.entries(classes))document.body.classList.toggle(cls,!!o[key]);
 const scale=[.9,1,1.1,1.2,1.3].includes(Number(o.uiScale))?Number(o.uiScale):1;
 if(document.body?.style)document.body.style.zoom=String(scale);
 const ids={largeText:'settingLargeText',reduceMotion:'settingReduceMotion',compactUI:'settingCompact',highContrast:'settingHighContrast',largeControls:'settingLargeControls',reduceBackground:'settingReduceBackground'};
 const titleIds={largeText:'titleLargeText',reduceMotion:'titleReduceMotion',compactUI:'titleCompact',highContrast:'titleHighContrast',largeControls:'titleLargeControls',reduceBackground:'titleReduceBackground'};
 for(const [key,id] of Object.entries(ids))if($(id))$(id).checked=!!o[key];
 for(const [key,id] of Object.entries(titleIds))if($(id))$(id).checked=!!o[key];
 if($('settingUiScale'))$('settingUiScale').value=String(scale);if($('titleUiScale'))$('titleUiScale').value=String(scale);
}
function setGameOption(key,value){
 const allowed=['largeText','reduceMotion','compactUI','highContrast','largeControls','reduceBackground','uiScale'];if(!allowed.includes(key))return;
 g.options||={};g.options[key]=key==='uiScale'?( [.9,1,1.1,1.2,1.3].includes(Number(value))?Number(value):1):!!value;
 applyGameOptions();save();
}
function resetGameOptions(){g.options={largeText:false,reduceMotion:false,compactUI:false,highContrast:false,largeControls:false,reduceBackground:false,uiScale:1};applyGameOptions();save();}
function npcServerAction(npcId,action){
 const npc=npcBy(npcId);if(!npc)return;if(!npcInInteractionRange(npc))return alert('Подойди ближе к сталкеру. Радиус взаимодействия — 8 м.');
 if(zoneSocket?.connected&&zonePlayerReady){zoneSocket.emit('npc:interact',{npcId,action});return;}
 // Offline fallback keeps NPC rumor interaction playable even when the online world is unavailable.
 const rumors=['На старой дороге заметили свежий патруль. Не суйся туда без разведки.','Торговцы ждут караван с медикаментами. Говорят, он задержался у Свалки.','На Янтаре вырос фон. Учёные просят не приближаться к старому корпусу.','На севере ищут проводника, который знает обход вокруг блокпоста.','У костра шепчутся, что один из тайников недавно вскрыли.'];
 const topicList=Array.isArray(npc.topics)?npc.topics:[];
 const response=action==='ask'?(topicList[1]?.[1]||rumors[Math.abs(String(npcId).split('').reduce((a,c)=>a+c.charCodeAt(0),0))%rumors.length]):'Сталкер внимательно слушает тебя.';
 renderCopDialogue(npc,response,[['Задать другой вопрос',0],['Завершить разговор',1]]);
 const choices=$('dialogueChoices');if(choices)choices.innerHTML=`<button onclick="startTalk('${escapeHtml(npcId)}')">Задать другой вопрос</button><button onclick="closeTalk()">Попрощаться</button>`;
 log(`Слух от ${npc.name}: ${response}`);g.rep=Math.min(1000,(Number(g.rep)||0)+1);save();
}
function npcSpecialistAction(npcId){
 const npc=npcBy(npcId);if(!npc)return;
 if(npc.role==='техник'){openRepairWorkshop(npcId);return;}
 const cost=75;
 if(g.money<cost)return alert(`Нужно ${cost} ₽ за услугу.`);
 if(g.hp>=100)return alert('Здоровье уже в порядке.');
 g.money-=cost;g.hp=Math.min(100,g.hp+35);log(`${npc.name} оказал медицинскую помощь. Здоровье восстановлено.`);save();
}
function repairableGear(){return (g.items||[]).filter(x=>['Оружие','Броня','Шлем','Детектор'].includes(x.type)&&Number(x.qty||1)>0);}
function repairCost(item,npc){
 const missing=100-Math.max(0,Math.min(100,Number(item.condition??100)));
 const base=Math.max(1,Number(item.value)||100);
 const factionTech=npc?.id?.startsWith('faction-tech-');
 const multiplier=npc?.id==='azot'?.92:(factionTech?.94:1);
 const reputationDiscount=Math.min(.12,Math.max(0,Number(g.rep)||0)/5000);
 return missing<=0?0:Math.max(10,Math.ceil(base*(missing/100)*.72*multiplier*(1-reputationDiscount)));
}
function repairWorkshopItemCard(item,npc,selectedId){
 const condition=Math.max(0,Math.min(100,Number(item.condition??100))),cost=repairCost(item,npc),isSelected=item.id===selectedId;
 return `<button type="button" class="repair-backpack-item ${isSelected?'selected':''} ${condition>=100?'perfect':''}" onclick="selectRepairItem('${escapeHtml(npc.id)}','${escapeHtml(item.id)}')" aria-pressed="${isSelected}"><span class="repair-item-qty">×${Math.max(1,Number(item.qty)||1)}</span><span class="repair-item-glyph">${itemGlyph(item)}</span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.type)}</small><i><em style="width:${condition}%"></em></i><span class="repair-item-condition">${condition}%</span><span class="repair-item-cost">${condition>=100?'ИСПРАВНО':cost.toLocaleString('ru-RU')+' RU'}</span></button>`;
}
let repairSelectedItemId=null;
function openRepairWorkshop(npcId){
 const npc=npcBy(npcId);if(npc&&!npcInInteractionRange(npc))return alert('Подойди к технику ближе. Радиус обслуживания — 8 м.');if(!npc||npc.role!=='техник')return alert('Здесь нет техника, который может выполнить ремонт.');
 if(npc.loc!==g.loc)return alert('Техник должен находиться в текущей локации.');
 if(npc.id.startsWith('faction-tech-')&&npc.faction!==g.faction)return alert(`Этот техник служит группировке «${npc.faction}». Ремонт у него доступен только своим.`);
 const gear=repairableGear();const selected=gear.find(x=>x.id===repairSelectedItemId)||gear.find(x=>x.name===g.equipment?.weapon)||gear.find(x=>x.name===g.equipment?.suit)||gear[0]||null;repairSelectedItemId=selected?.id||null;
 const old=document.getElementById('repairWorkshopOverlay');if(old)old.remove();
 const overlay=document.createElement('div');overlay.id='repairWorkshopOverlay';overlay.className='repair-overlay repair-pda-overlay';
 const damaged=gear.filter(x=>Number(x.condition??100)<100),total=damaged.reduce((sum,x)=>sum+repairCost(x,npc),0);
 const portrait=portraitMarkup(npc,true);
 const selectedCondition=selected?Math.max(0,Math.min(100,Number(selected.condition??100))):0;
 const selectedCost=selected?repairCost(selected,npc):0;
 const equippedWeapon=g.items.find(x=>x.name===g.equipment?.weapon&&x.type==='Оружие');
 const equippedArmor=g.items.find(x=>x.name===g.equipment?.suit&&x.type==='Броня');
 const equippedDetector=g.items.find(x=>x.name===g.equipment?.tool&&x.type==='Детектор');
 overlay.innerHTML=`<div class="repair-pda-shell"><header class="repair-pda-top"><div class="repair-tech-identity"><div class="repair-tech-portrait">${portrait}</div><div><b>${escapeHtml(npc.name)}</b><small>${escapeHtml(npc.faction||'Техническая служба')} · ТЕХНИК</small><button type="button" onclick="repairAllGear('${escapeHtml(npc.id)}')">РЕМОНТ ВСЕГО СНАРЯЖЕНИЯ</button></div></div><div class="repair-player-identity"><div><b>${escapeHtml(playerDisplayName())}</b><small>${escapeHtml(g.faction||'Одиночки')} · ПОЛЕВОЙ СТАЛКЕР</small><strong>${Number(g.money||0).toLocaleString('ru-RU')} RU</strong></div><div class="repair-player-portrait">☻</div></div><button class="repair-close" aria-label="Закрыть мастерскую" onclick="document.getElementById('repairWorkshopOverlay')?.remove()">×</button></header><div class="repair-pda-grid"><section class="repair-pda-left"><div class="repair-pda-section-title">ЭКИПИРОВКА / ОБСЛУЖИВАНИЕ</div><div class="repair-armor-display"><div class="repair-armor-art">▤</div><b>${escapeHtml(equippedArmor?.name||'Броня не экипирована')}</b><small>${equippedArmor?Math.round(equippedArmor.condition??100)+'% прочности':'Слот брони пуст'}</small><button type="button" onclick="${equippedArmor?`selectRepairItem('${escapeHtml(npc.id)}','${escapeHtml(equippedArmor.id)}')`:'void(0)'}" ${equippedArmor?'':'disabled'}>ВЫБРАТЬ</button></div><div class="repair-equipment-slots"><div><small>ОСНОВНОЕ ОРУЖИЕ</small><b>${escapeHtml(equippedWeapon?.name||'Не установлено')}</b><span>${equippedWeapon?Math.round(equippedWeapon.condition??100)+'%':'—'}</span></div><div><small>ДЕТЕКТОР</small><b>${escapeHtml(equippedDetector?.name||'Не установлен')}</b><span>${equippedDetector?Math.round(equippedDetector.condition??100)+'%':'—'}</span></div><div><small>ВТОРОЕ ОРУЖИЕ</small><b>${escapeHtml(g.equipment?.sidearm||'Пусто')}</b><span>—</span></div><div><small>СЕРВИС</small><b>${damaged.length} предметов требуют ремонта</b><span>${total.toLocaleString('ru-RU')} RU</span></div></div><div class="repair-left-note">Техник: ${escapeHtml(npc.desc||'Мастерская группировки')}<br>Скидка: ${npc.id==='azot'?'8% · тариф Азота':npc.id.startsWith('faction-tech-')?'6% · тариф группировки':'по репутации'}</div></section><section class="repair-pda-center"><div class="repair-pda-section-title">ПЕРСОНАЛЬНОЕ СНАРЯЖЕНИЕ</div><div class="repair-character-silhouette"><div class="repair-mask-slot">◉<small>ШЛЕМ</small></div><div class="repair-body-slot">▤<small>${escapeHtml((g.equipment?.suit||'КОСТЮМ').toUpperCase())}</small></div><div class="repair-belt-slot">▣<small>ПОЯС / КПК</small></div></div><div class="repair-selected-card">${selected?`<div class="repair-selected-glyph">${itemGlyph(selected)}</div><div class="repair-selected-info"><small>ВЫБРАННЫЙ ПРЕДМЕТ</small><b>${escapeHtml(selected.name)}</b><span>${escapeHtml(selected.type)} · ${selectedCondition}% прочности</span><div class="repair-selected-meter"><i><em style="width:${selectedCondition}%"></em></i></div><strong>${selectedCondition>=100?'РЕМОНТ НЕ ТРЕБУЕТСЯ':selectedCost.toLocaleString('ru-RU')+' RU'}</strong></div>`:'<div class="repair-empty">Выбери предмет в рюкзаке справа.</div>'}</div><button class="repair-selected-action" onclick="${selected?`repairGearItem('${escapeHtml(npc.id)}','${escapeHtml(selected.id)}')`:'void(0)'}" ${!selected||selectedCondition>=100||Number(g.money||0)<selectedCost?'disabled':''}>ПОЧИНИТЬ ВЫБРАННЫЙ ПРЕДМЕТ</button><div class="repair-center-stats"><span>ПРЕДМЕТОВ В РЮКЗАКЕ <b>${gear.length}</b></span><span>ТРЕБУЮТ РЕМОНТА <b>${damaged.length}</b></span></div></section><section class="repair-pda-right"><div class="repair-pda-section-title">ИНВЕНТАРЬ СТАЛКЕРА <span>${gear.length} ПРЕДМ.</span></div><div class="repair-backpack-grid">${gear.map(x=>repairWorkshopItemCard(x,npc,selected?.id)).join('')||'<div class="repair-empty">В рюкзаке нет оружия, брони или детекторов.</div>'}</div><div class="repair-inventory-foot"><span>ВСЕГО ПРЕДМЕТОВ ДЛЯ РЕМОНТА: ${gear.length}</span><b>ОБЩИЙ ВЕС: ${(g.items||[]).reduce((sum,x)=>sum+(Number(x.weight)||0)*(Number(x.qty)||1),0).toFixed(1)} кг</b></div></section></div><footer class="repair-pda-footer"><span>ZONE ONLINE / ТЕХНИЧЕСКАЯ СЛУЖБА</span><span>РЕМОНТ ВОССТАНАВЛИВАЕТ ПРОЧНОСТЬ ДО 100%</span><button onclick="document.getElementById('repairWorkshopOverlay')?.remove()">ВЫХОД</button></footer></div>`;
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});document.body.append(overlay);
}
function selectRepairItem(npcId,itemId){repairSelectedItemId=itemId;openRepairWorkshop(npcId);}
function repairGearItem(npcId,itemId){
 const npc=npcBy(npcId),item=g.items.find(x=>x.id===itemId);if(!npc||!item)return;
 if(npc.loc!==g.loc)return alert('Техник должен находиться рядом.');
 if(npc.id.startsWith('faction-tech-')&&npc.faction!==g.faction)return alert('Ремонт доступен только у техника твоей группировки.');
 const cost=repairCost(item,npc);if(Number(item.condition??100)>=100)return alert('Предмет уже полностью исправен.');
 if((Number(g.money)||0)<cost)return alert(`Не хватает ${cost-(Number(g.money)||0)} RU.`);
 g.money-=cost;item.condition=100;log(`${npc.name} отремонтировал ${item.name} до 100%. Потрачено ${cost} RU.`);save();repairSelectedItemId=itemId;openRepairWorkshop(npcId);
}
function repairAllGear(npcId){
 const npc=npcBy(npcId);if(!npc)return;
 const gear=repairableGear().filter(x=>Number(x.condition??100)<100),total=gear.reduce((sum,x)=>sum+repairCost(x,npc),0);
 if(!gear.length)return alert('Всё снаряжение исправно.');
 if((Number(g.money)||0)<total)return alert(`Для полного ремонта нужно ${total.toLocaleString('ru-RU')} RU. Не хватает ${(total-(Number(g.money)||0)).toLocaleString('ru-RU')} RU.`);
 g.money-=total;for(const item of gear)item.condition=100;
 log(`${npc.name} полностью обслужил снаряжение. Отремонтировано предметов: ${gear.length}. Потрачено ${total} RU.`);save();repairSelectedItemId=null;openRepairWorkshop(npcId);
}
let lastNpcApproach=null;
function showNpcApproach(data){const n=npcBy(data?.npcId);if(!n)return;lastNpcApproach=data.npcId;npcApproachHistory.unshift({npcId:n.id,name:n.name,text:data.text||'Сталкер хочет поговорить.',location:locationName(g.loc),at:Date.now()});npcApproachHistory=npcApproachHistory.slice(0,20);renderZoneReports();}
function squadAction(action,targetId){if(!zoneSocket?.connected)return alert('Для отряда требуется подключение к серверу.');zoneSocket.emit('squad:'+action,{targetId});}
function squadRole(memberId,role){zoneSocket?.emit('squad:role',{memberId,role});}
function squadEscort(npcId){zoneSocket?.emit('squad:escort',{npcId});}
function renderPlayerSquad(data){const el=$('playerSquadPanel');if(!el)return;activePlayerSquad=data?.squad||null;el.innerHTML=window.ZonePlayerSquadView.panelHtml(data,{g,zonePlayerId,escapeHtml,npcBy,locationName});}
function friendRequest(targetId){if(!zoneSocket?.connected)return alert('Для добавления друзей требуется подключение к серверу.');zoneSocket.emit('friend:request',{targetId});}
function renderSquads(){renderPlayerSquad({squad:activePlayerSquad||null});const overview=$('squadOverview');if(overview){const squad=activePlayerSquad;overview.innerHTML=squad?`<div class="squad-overview-card"><b>Отряд «${escapeHtml(squad.name)}»</b><span>${squad.members?.length||0}/4 бойцов · ${escapeHtml(locationName(squad.location))}</span></div>`:'<div class="mutedbox small">Ты пока не состоишь в отряде. Создай группу или прими приглашение от другого сталкера.</div>';}const list=$('localNpcSquads');if(list){const buckets=new Map();for(const n of (g.npcs||[]).filter(n=>n.loc===g.loc&&n.alive!==false)){const key=n.squadId||`solo:${n.id}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(n);}list.innerHTML=[...buckets.values()].map(m=>`<div class="item"><div><b>${escapeHtml(m[0].squadName||m[0].name||'Группа сталкеров')}</b><div class="desc">${m.length} бойца · ${escapeHtml(m[0].faction||'Нейтралы')} · ${escapeHtml(m[0].squadType||'полевой отряд')}</div></div><span class="tag">${escapeHtml(m[0].behavior||m[0].action||'на месте')}</span></div>`).join('')||'<div class="mutedbox small">В этом секторе пока не замечено групп.</div>';}}
function renderPlayerFriends(list=[]){const el=$('playerFriendsPanel');if(!el)return;el.innerHTML=(list||[]).map(f=>`<div class="small">★ ${escapeHtml(f.name)} · ${escapeHtml(f.faction||'Сталкер')}</div>`).join('')||'<div class="mutedbox small">Пока нет друзей в Зоне.</div>'; }

function renderQuick(){}
function travel(id,preservePending=false){const l=g.locations.find(x=>x.id===id);if(!l||id===g.loc)return;if(activePlayerSquad&&activePlayerSquad.leader!==zonePlayerId)return alert('Отрядом командует лидер. Попроси его сменить маршрут или покинь отряд.');if(!preservePending)pendingKeyPointApproach=null;else preservePendingKeyPointApproach=true;const dest=$('expeditionDestination');if(dest)dest.value=id;startExpedition();}

let mapListCacheKey='';
function renderFactionCasualtyNotices(){
 const root=$('factionCasualtyNotices');if(!root)return;const notices=(serverWorld?.factionNotices||[]).filter(n=>!n.faction||n.faction===g.faction).slice(0,12);root.innerHTML=notices.length?notices.map(n=>`<article class="npc-card"><b>⚑ ${escapeHtml(n.name||'Потеря отряда')}</b><small>${escapeHtml(n.location||'Неизвестный сектор')} · ${new Date(Number(n.at)||Date.now()).toLocaleString('ru-RU')}</small><p>${escapeHtml(n.text||'Получено сообщение о потерях.')}</p></article>`).join(''):'<div class="mutedbox small">Свежих сообщений о потерях твоей группировки пока нет.</div>';
}
function renderCorpseRecovery(){
 renderFactionCasualtyNotices();
 const root=$('corpseRecoveryList');if(!root)return;const corpses=(serverWorld?.npcCorpses||[]).filter(c=>c.location===g.loc);if(!corpses.length){root.innerHTML='<div class="mutedbox small">В этом секторе свежих тел не обнаружено.</div>';return;}
 const pos=g.worldPosition||sectorCenter(g.loc);root.innerHTML=corpses.map(c=>{const d=Math.round(Math.hypot((Number(pos.x)||0)-(Number(c.x)||0),(Number(pos.y)||0)-(Number(c.y)||0)));const near=d<=18;return `<article class="npc-card"><b>☠ ${escapeHtml(c.name||'Неизвестный сталкер')}</b><small>${escapeHtml(c.faction||'Неизвестная группировка')} · ${Math.max(0,Math.ceil((Number(c.expiresAt)-Date.now())/60000))} мин. до исчезновения</small><p>${near?'Тело рядом. Можно обыскать.':`Расстояние: ${d} м. Подойди ближе (18 м).`}</p><button ${near?'':'disabled'} onclick="lootNpcCorpse('${escapeHtml(c.id)}')">Обыскать тело</button></article>`;}).join('');
}
function lootNpcCorpse(id){if(!zoneSocket?.connected){alert('Нет соединения с сервером.');return;}zoneSocket.emit('npc:corpse:loot',{corpseId:id});}
let currentStashes=[];
function renderStashes(){const root=$('stashList');if(!root)return;const pos=playerWorldPosition(),list=(currentStashes||[]).filter(s=>s.location===g.loc);root.innerHTML=list.length?list.map(s=>{if(!s.discovered)return `<article class="npc-card"><b>⌕ Неизвестный участок</b><p class="small muted">Координаты пока не найдены. Продолжай поиски или расспроси информатора.</p></article>`;const d=Math.round(Math.hypot(pos.x-Number(s.x),pos.y-Number(s.y)));return `<article class="npc-card"><b>▣ Тайник · ${escapeHtml(locationName(s.location))}</b><small>Координаты ${Math.round(s.x)}, ${Math.round(s.y)} · ${d} м</small><p>${escapeHtml(s.note||'Записка указывает на старое укрытие.')}</p><button onclick="${d<=18?`lootFieldStash('${escapeHtml(s.id)}')`:`approachStash('${escapeHtml(s.id)}')`}">${d<=18?'Обыскать тайник':'Подойти ближе (18 м)'}</button></article>`;}).join(''):'<div class="mutedbox small">В этом секторе пока нет подтверждённых тайников. Осмотри местность.</div>';}
function searchStashArea(){if(!zoneSocket?.connected)return alert('Для поиска тайников требуется подключение к серверу.');zoneSocket.emit('stash:search');}
function lootFieldStash(id){if(!zoneSocket?.connected)return alert('Нет соединения с сервером.');zoneSocket.emit('stash:loot',{stashId:id});}
function buyStashIntel(npcId){if(!zoneSocket?.connected)return alert('Нет соединения с сервером.');zoneSocket.emit('stash:buy-intel',{npcId});}
let mapIntelTab='brief';
function setMapIntelTab(tab){
 const allowed=['brief','news','tasks','radio','sectors'];if(!allowed.includes(tab))return;
 mapIntelTab=tab;renderMapIntel();
}
function renderMapIntel(){
 const root=$('mapIntelContent');if(!root)return;
 document.querySelectorAll('[data-map-intel]').forEach(b=>b.classList.toggle('active',b.dataset.mapIntel===mapIntelTab));
 const here=(g.locations||[]).find(l=>l.id===g.loc)||{};
 const active=(g.quests||[]).filter(q=>q.accepted&&!q.done);
 const currentNpcs=(g.npcs||[]).filter(n=>n.loc===g.loc&&n.alive!==false);
 const recent=(g.news||[]).slice(0,5);
 const risk=here.risk||'Неизвестно';
 if(mapIntelTab==='brief'){
  const world=g.world||{};
  root.innerHTML=`<div class="map-intel-brief"><article><small>ТЕКУЩИЙ СЕКТОР</small><b>${escapeHtml(here.icon||'⌖')} ${escapeHtml(here.name||locationName(g.loc))}</b><span>${escapeHtml(here.owner||'Неизвестный контроль')} · риск: ${escapeHtml(risk)}</span></article><article><small>ПОГОДА И СРЕДА</small><b>${escapeHtml(world.weather||'Данные недоступны')}</b><span>${escapeHtml(world.emission||'Нет данных')} · ${escapeHtml(world.mutants||'Следы не отмечены')}</span></article><article><small>ОПЕРАТИВНАЯ СВОДКА</small><b>${active.length} активных заданий</b><span>${currentNpcs.length} известных контактов в секторе</span></article></div><div class="map-intel-actions"><button type="button" onclick="view('zoneReports')">Полевая сводка</button><button type="button" onclick="view('quests')">Мои задания</button><button type="button" onclick="view('radio')">Открыть радиосеть</button></div><div class="map-intel-latest"><b>Последнее сообщение</b><span>${recent.length?escapeHtml(recent[0].title+': '+recent[0].body):'Новых сообщений пока нет.'}</span></div>`;
 }else if(mapIntelTab==='news'){
  root.innerHTML=`<div class="map-intel-list">${recent.map(n=>`<article><div><b>${escapeHtml(n.title||'Событие Зоны')}</b><small>День ${Number(n.day)||1} · ${escapeHtml(n.hour||'--:--')}</small></div><p>${escapeHtml(n.body||'')}</p></article>`).join('')||'<div class="mutedbox small">Новостей пока нет.</div>'}</div><div class="map-intel-actions"><button type="button" onclick="view('journal')">Полная лента новостей</button><button type="button" onclick="generateRumor();renderMapIntel()">Запросить слухи</button></div>`;
 }else if(mapIntelTab==='tasks'){
  root.innerHTML=`<div class="map-intel-list">${active.slice(0,4).map(q=>`<article><div><b>${escapeHtml(q.title)}</b><small>${Number(q.reward)||0} ₽ · ${Number(q.xp)||0} опыта</small></div><p>${escapeHtml(q.desc||'')}</p></article>`).join('')||'<div class="mutedbox small">Нет принятых заданий. Загляни к сталкерам или открой доску заданий.</div>'}</div><div class="map-intel-actions"><button type="button" onclick="view('quests')">Доска заданий</button><button type="button" onclick="view('people')">Найти заказчиков</button></div>`;
 }else if(mapIntelTab==='radio'){
  const messages=(factionRadioMessages||[]).slice(-3).reverse();
  root.innerHTML=`<div class="map-intel-list">${messages.map(m=>`<article><div><b>${escapeHtml(m.title||m.name||'Входящая передача')}</b><small>${escapeHtml(locationName(m.location||''))}</small></div><p>${escapeHtml(m.text||'')}</p></article>`).join('')||'<div class="mutedbox small">Пока нет свежих передач. Радиосеть принимает сообщения автоматически при подключении.</div>'}</div><div class="map-intel-actions"><button type="button" onclick="view('radio')">Полная радиосеть</button><span class="map-intel-note">Только приём · передача сообщений недоступна</span></div>`;
 }else{
  const sectors=(g.locations||[]).filter(l=>l.id!==g.loc).sort((a,b)=>(Number(b.risk==='Критический')-Number(a.risk==='Критический'))).slice(0,6);
  root.innerHTML=`<div class="map-intel-sector-list">${sectors.map(l=>`<button type="button" onclick="selectLocation('${String(l.id).replace(/[^a-z0-9_-]/gi,'')}')"><span><b>${escapeHtml(l.icon||'⌖')} ${escapeHtml(l.name)}</b><small>${escapeHtml(l.owner||'Неизвестный контроль')}</small></span><em>${escapeHtml(l.risk||'—')}</em></button>`).join('')}</div><div class="map-intel-actions"><span class="map-intel-note">Выбери сектор, чтобы открыть его сведения и маршрут.</span><button type="button" onclick="setMapMode('zone')">Показать всю Зону</button></div>`;
 }
 const subtitle=$('mapIntelSubtitle');if(subtitle)subtitle.textContent=`${locationName(g.loc)} · ${({brief:'Сводка сектора',news:'Последние сообщения КПК',tasks:'Принятые поручения',radio:'Входящие передачи группировки',sectors:'Разведданные по секторам'})[mapIntelTab]}`;
}
function renderMap(){
 renderMapIntel();
 if((($("world")?.classList.contains("active")||!zoneMapHasRendered)&&zoneMapDirty))renderZoneMap();
 const host=$("map");if(!host)return;
 const key=JSON.stringify([g.loc,chosenLoc,(g.locations||[]).map(l=>[l.id,l.name,l.icon,l.owner,l.risk,l.travel,l.control])]);
 if(key===mapListCacheKey)return;
 mapListCacheKey=key;
 host.innerHTML=g.locations.map(l=>`<button class="loc ${chosenLoc===l.id?"selected":""}" onclick="selectLocation('${l.id}')"><b>${l.icon} ${l.name}</b><span class="owner">${l.owner}</span><span class="risk">Опасность: ${l.risk} · Расход сил: ${(l.travel||0)*5}%</span>${l.id===g.loc?'<span class="tag">Вы здесь</span>':""}</button>`).join("");
}
function selectLocation(id){
 chosenLoc=id;let l=g.locations.find(x=>x.id===id),pts=g.keyPoints?.[id]||[];
 $("locationInfo").innerHTML=`<b>${l.icon} ${l.name}</b> <span class="tag">${l.owner}</span><p class="muted small">${l.desc}</p><div class="small">Контроль: ${l.control}% · Уровень риска: ${l.risk}</div><div class="bar"><i style="width:${l.control}%"></i></div><div class="rightbuttons" style="margin-top:10px">${id===g.loc?'<span class="tag">Текущая локация</span>':`<button onclick="travel('${id}')">Пешая экспедиция · ${l.travel} ч.</button>${g.loc===(factionGuides[g.faction]?.base||'')&&((g.visitedLocations||[]).includes(id))?`<button class="guide-fast-travel" onclick="useFactionGuide('${id}')">Проводник · ${guideFare(id).toLocaleString('ru-RU')} ₽</button>`:''}`}<button onclick="influence('${id}')" ${l.owner===g.faction?"disabled":""}>Повысить влияние · 120 ₽</button></div><div class="section">Ключевые точки сектора</div><div class="poi-list">${pts.map(p=>`<div class="poi ${p.discovered?"discovered":""}"><b>${p.discovered?"✓":"⌖"} ${p.name}</b><span class="poi-marker">${p.kind}</span><small>${p.discovered?p.desc:"Сведения отсутствуют"}</small>${id===g.loc&&!p.discovered?`<div style="margin-top:7px"><button onclick="discoverPoint('${p.id}')">Исследовать</button></div>`:""}</div>`).join("")}</div>`;
 renderMap();
}
function explore(){startAreaSurvey()}
function searchAnomaly(){searchArtifacts()}
function rest(){if(zoneSocket?.connected&&zonePlayerReady){zoneSocket.emit('player:rest');return;}g.stamina=Math.min(100,g.stamina+(g.hunger>85||g.thirst>85?12:35)*(1+artifactEffect('staminaRegen')));g.hp=Math.min(100,g.hp+5+Math.round(artifactEffect('restHealing')*10));log("Ты отдохнул у костра. Силы частично восстановлены.");save()}
function roamNPCs(){if(Math.random()>.32)return;let candidates=g.npcs.filter(n=>n.id.startsWith("wander_")&&n.loc!==g.loc);if(!candidates.length)return;let n=candidates[Math.floor(Math.random()*candidates.length)],from=g.locations.find(l=>l.id===n.loc),dest=g.locations[Math.floor(Math.random()*g.locations.length)];if(!from||!dest||from.id===dest.id)return;from.people=from.people.filter(id=>id!==n.id);dest.people.push(n.id);n.loc=dest.id;news("Сталкеры в пути",n.name+" замечен в районе «"+dest.name+"». ");log("Слухи: сталкер "+n.name+" сменил район.")}
function renderQuests(){let qs=g.quests.filter(q=>(q.faction||'Одиночки')===(g.faction||'Одиночки')&&(questFilter==="all"||(questFilter==="active"&&q.accepted&&!q.done)||(questFilter==="done"&&q.done)));$("questList").innerHTML=qs.map(q=>{const giver=(g.npcs||[]).find(n=>n.name===q.giver);const art=giver?portraitMarkup(giver):`<div class="quest-portrait-fallback">▣</div>`;return `<article class="item block quest-card"><div class="quest-card-main">${art}<div class="quest-card-copy"><div class="quest-card-title"><b>${escapeHtml(q.title)}</b><span class="tag ${q.done?'quest-done':''}">${q.done?"Завершено":q.accepted?"Активно":"Не принято"}</span></div><div class="desc">Выдал: ${escapeHtml(q.giver)} · Награда: ${q.reward} ₽ · ${q.xp} опыта</div>${q.chapter?`<div class="small gold">${escapeHtml(q.chapter)}</div>`:""}<p class="small">${escapeHtml(q.desc)}</p>${q.accepted&&!q.done?`<div class="rightbuttons"><button onclick="turnIn('${q.id}')">Проверить выполнение</button></div>`:!q.done?`<button onclick="acceptQuest('${q.id}')">Принять задание</button>`:""}</div></div></article>`}).join("")||'<div class="mutedbox">Здесь пока пусто.</div>'}
function acceptQuest(id){let q=g.quests.find(x=>x.id===id);if(!q||(q.faction||'Одиночки')!==(g.faction||'Одиночки'))return;if(zoneSocket?.connected&&zonePlayerReady){zoneSocket.emit('player:quest:accept',{questId:id});return;}q.accepted=true;log("Принято задание: "+q.title);news("Новое задание",q.title);save()}
function turnIn(id){let q=g.quests.find(x=>x.id===id);if(!q||!q.accepted||q.done||(q.faction||'Одиночки')!==(g.faction||'Одиночки'))return;if(zoneSocket?.connected&&zonePlayerReady){zoneSocket.emit('player:quest:turnin',{questId:id});return;}if(!window.ZoneQuests.canComplete(g,q,g.loc)){alert("Пока условия задания не выполнены. Проверь описание и поговори с нужными персонажами.");return}if(id==="scrap")take("scrap",3);if(id==="bread")take("bread",2);if(q.requiredItem)take(q.requiredItem,Number(q.requiredQty||1));if(q.requiredItemType){let remaining=Number(q.requiredQty||1);for(const item of g.items.filter(item=>item.type===q.requiredItemType)){const used=Math.min(remaining,Number(item.qty)||0);item.qty-=used;remaining-=used;if(remaining<=0)break;}g.items=g.items.filter(item=>Number(item.qty)>0);}q.done=true;g.money+=q.reward;g.xp+=q.xp;g.rep+=q.rep;g.completed++;log("Задание выполнено: "+q.title+". Получено "+q.reward+" ₽.");news("Задание выполнено",q.title+" — награда начислена.");save()}
function tradeGoods(){return window.ZoneTradeCatalog.goods;}
function buy(i){let x=tradeGoods()[i];if(!x)return;if(!window.ZoneEconomy.canAfford(g.money,x[3]))return alert("Не хватает рублей.");if(zoneSocket?.connected){zoneSocket.emit('market:buy',{item:x[1]});return;}g.money-=x[3];const gear=x[2]==="Броня"?{condition:100,defense:({armor_leather:2,armor_stalker:3,armor_zarya:5,armor_seva:7,armor_bulat:9,armor_exo:11,armor_sunrise:4,armor_berill:8,armor_guardian:7,armor_cs3a:7,armor_ps5m:6})[x[1]]||2}:x[2]==="Шлем"?{condition:100,defense:({helmet_stalker:1,helmet_zarya:2,helmet_seva:3,helmet_bulat:4})[x[1]]||1}:x[2]==="Рюкзак"?{capacity:({backpack_field:65,backpack_expedition:80})[x[1]]||50}:{};addItem(x[1],x[0],x[2],x[5],x[4],Math.floor(x[1]==="bolt"?5:1));Object.assign(g.items.find(z=>z.id===x[1]),gear);log("Куплено: "+x[0]+".");save()}

function sell(id,amount=1){let x=g.items.find(i=>i.id===id);if(!x)return;amount=Math.max(1,Math.min(x.qty,Math.floor(Number(amount)||1)));if(zoneSocket?.connected){if(amount!==1)return alert("В онлайн-режиме продавай предметы по одной единице за операцию.");zoneSocket.emit('market:sell',{item:id,qty:amount});return;}x.qty-=amount;const payout=window.ZoneEconomy.saleTotal(x,amount);g.money+=payout;if(x.qty<=0)g.items=g.items.filter(i=>i.id!==id);log("Продано: "+x.name+" ×"+amount+" · +"+payout+" ₽.");save()}
function useItem(id){let x=g.items.find(i=>i.id===id);if(!x)return;if(zoneSocket?.connected&&zonePlayerReady){zoneSocket.emit('player:item:use',{itemId:id});return;}const nutrition=window.ZONE_CONTENT?.foods?.[id];if(nutrition){g.hunger=Math.max(0,g.hunger-(nutrition.satiety||0));g.thirst=Math.max(0,g.thirst-(nutrition.hydration||0));g.stamina=Math.min(100,g.stamina+(nutrition.stamina||0));take(id,1);log("Использован припас: "+x.name+". Голод и жажда уменьшились.");save();return;}if(id==="anti_rad"){g.radiation=Math.max(0,(g.radiation||0)-65);g.radiationProtectionUntil=Date.now()+12*60*1000;take(id,1);log("Антирад принят: уровень радиации снижен, защита действует 12 минут.");save();return;}if(id==="med"){if(g.hp>=100)return alert("Здоровье уже полное.");g.hp=Math.min(100,g.hp+35);take(id,1)}else if(id==="bandage"){if(g.hp>=100)return alert("Раны уже затянулись.");g.hp=Math.min(100,g.hp+15);take(id,1)}else if(id==="painkillers"){if(g.stamina>=100)return alert("Выносливость уже восстановлена.");g.stamina=Math.min(100,g.stamina+25);g.needs||={};g.needs.stress=Math.max(0,(g.needs.stress||0)-8);take(id,1)}else if(id==="trauma_kit"){if(g.hp>=100)return alert("Тяжёлых ранений нет.");g.hp=Math.min(100,g.hp+55);g.stamina=Math.max(0,g.stamina-5);take(id,1)}else if(id==="bread"){g.stamina=Math.min(100,g.stamina+20);take(id,1)}else return alert("Этот предмет нельзя использовать напрямую.");log("Использован предмет: "+x.name+".");save()}
function itemGlyph(x){return window.ZoneInventoryView.itemGlyph(x);}

function syncEquipmentSlot(slot){if(zoneSocket?.connected)zoneSocket.emit("player:equipment:update",{slot,itemName:g.equipment?.[slot]||""});}
function gearSlotForItem(x){return window.ZoneInventory.slotForItem(x);}
function equipItem(id){const x=g.items.find(i=>i.id===id);if(!x)return;const slot=gearSlotForItem(x);if(!slot)return alert("Этот предмет нельзя экипировать.");if(!window.ZoneInventory.equip(g.equipment,x,slot))return;log("Экипировано: "+x.name+" · "+({weapon:"основное оружие",suit:"броня",tool:"детектор",helmet:"шлем",backpack:"рюкзак",artifact:"артефакт"}[slot]));save();syncEquipmentSlot(slot);renderInventory();document.querySelector(".inventory-inspect")?.remove();}
function openGearSlot(slot){const types={weapon:["Оружие"],sidearm:["Оружие"],suit:["Броня"],tool:["Детектор"],helmet:["Шлем"],backpack:["Рюкзак"],artifact:["Артефакт"]};const names=types[slot];if(!names)return;const list=window.ZoneInventory.itemsForSlot(g.items,slot,g.equipment);const title=({weapon:"Основное оружие",sidearm:"Второе оружие",suit:"Бронекостюм",tool:"Детектор",helmet:"Шлем",backpack:"Рюкзак",artifact:"Артефакт"})[slot];const overlay=document.createElement("div");overlay.className="inventory-inspect gear-picker-overlay";overlay.innerHTML=`<section class="inventory-inspect-card gear-picker"><button class="inspect-close" onclick="this.closest('.inventory-inspect').remove()">×</button><small>СИСТЕМА ЭКИПИРОВКИ</small><h2>${title}</h2><p>Выбери предмет из рюкзака.</p><div class="gear-picker-list">${list.map(x=>`<button type="button" onclick="equipIntoSlot('${slot}','${x.id}')"><span>${itemGlyph(x)}</span><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.type)} · ${Number(x.weight||0).toFixed(1)} кг</small></button>`).join("")||'<div class="mutedbox">Подходящих предметов в рюкзаке нет.</div>'}</div><button class="quiet-action" onclick="unequipSlot('${slot}')">Снять предмет</button></section>`;overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});document.body.append(overlay);}
function equipIntoSlot(slot,id){const x=g.items.find(i=>i.id===id);if(!x)return;if(!window.ZoneInventory.equip(g.equipment,x,slot))return alert("Этот предмет не подходит для выбранного слота.");log("Экипировано: "+x.name);save();syncEquipmentSlot(slot);renderInventory();document.querySelector(".gear-picker-overlay")?.remove();}
function unequipSlot(slot){if(!window.ZoneInventory.unequip(g.equipment,slot))return;save();syncEquipmentSlot(slot);renderInventory();document.querySelector(".gear-picker-overlay")?.remove();}
function rankForXpClient(xp){const ranks=[[0,'Новичок'],[50,'Опытный сталкер'],[150,'Следопыт'],[300,'Ветеран Зоны'],[600,'Легенда Зоны']];return ranks.filter(x=>Number(xp||0)>=x[0]).at(-1)?.[1]||'Новичок'}
function inventoryViewContext(){return {g,$,playerDisplayName,rankForXpClient,escapeHtml,document};}
function renderInventory(){return window.ZoneInventoryView.renderInventory(inventoryViewContext());}
function inspectInventoryItem(id){return window.ZoneInventoryView.inspectInventoryItem(inventoryViewContext(),id);}

let tradeCategory='all';
function setTradeCategory(category){tradeCategory=category;renderTrade()}

let tradeBasket=window.ZoneTradeBasket.create();
function tradeAllowDrop(ev){ev.preventDefault();ev.dataTransfer.dropEffect='copy';}
function tradeDragStart(ev,side,key){ev.dataTransfer.setData('application/x-zone-trade',JSON.stringify({side,key:String(key)}));ev.dataTransfer.effectAllowed='copy';}
function tradeDrop(ev,target){ev.preventDefault();let raw=ev.dataTransfer.getData('application/x-zone-trade');try{const d=JSON.parse(raw);if(d.side===target)addTradeBasket(target,d.key);}catch(_){}}
function addTradeBasket(side,key){
 const item=side==='sell'?g.items.find(x=>x.id===key):null;
 tradeBasket=window.ZoneTradeBasket.add(tradeBasket,side,key,{max:side==='sell'?Number(item?.qty)||0:20});
 renderTrade();
}
function removeTradeBasket(side,key){tradeBasket=window.ZoneTradeBasket.remove(tradeBasket,side,key);renderTrade();}
function clearTradeBasket(){tradeBasket=window.ZoneTradeBasket.create();renderTrade();}
function tradeBasketTotals(){return window.ZoneTradeBasket.totals(tradeBasket,tradeGoods(),g.items,window.ZoneEconomy.saleUnitPrice);}
function renderTradeBasket(){
 const goods=tradeGoods(),buyEl=$('tradeBuyBasket'),sellEl=$('tradeSellBasket');
 if(buyEl)buyEl.innerHTML=Object.entries(tradeBasket.buy).map(([i,q])=>{const x=goods[Number(i)];return x?`<div class="trade-basket-entry"><span>${escapeHtml(x[0])} ×${q}</span><b>${(x[3]*q).toLocaleString('ru-RU')} RU</b><button onclick="removeTradeBasket('buy','${i}')">×</button></div>`:''}).join('')||'Перетащи сюда товары торговца';
 if(sellEl)sellEl.innerHTML=Object.entries(tradeBasket.sell).map(([id,q])=>{const x=g.items.find(v=>v.id===id);return x?`<div class="trade-basket-entry"><span>${escapeHtml(x.name)} ×${q}</span><b>${(window.ZoneEconomy.saleUnitPrice(x)*q).toLocaleString('ru-RU')} RU</b><button onclick="removeTradeBasket('sell','${escapeHtml(id)}')">×</button></div>`:''}).join('')||'Перетащи сюда свои предметы';
 const totals=tradeBasketTotals(),status=$('tradeBasketStatus');
 if(status)status.textContent=`Покупка ${totals.buy.toLocaleString('ru-RU')} RU · продажа ${totals.sell.toLocaleString('ru-RU')} RU · ${totals.net>0?'к оплате '+totals.net.toLocaleString('ru-RU')+' RU':totals.net<0?'получишь '+Math.abs(totals.net).toLocaleString('ru-RU')+' RU':'без доплаты'}`;
}
function commitTradeBasket(){
 const deal=window.ZoneTradeBasket.toDeal(tradeBasket,tradeGoods());
 const buy=deal.buy;
 const sell=deal.sell;
 if(!buy.length&&!sell.length)return alert('Добавь предметы в корзину сделки.');
 const totals=tradeBasketTotals();
 if(!zoneSocket?.connected){
  if(g.money<totals.buy)return alert('Недостаточно рублей для этой сделки.');
  for(const x of sell){const item=g.items.find(v=>v.id===x.item);if(!item||item.qty<x.qty)return alert('Количество предметов в рюкзаке изменилось. Обнови корзину.');}
  g.money-=totals.buy;
  for(const x of buy){const item=tradeGoods().find(v=>v[1]===x.item);if(!item)continue;const gear=item[2]==='Броня'?{condition:100,defense:({armor_leather:2,armor_stalker:3,armor_zarya:5,armor_seva:7,armor_bulat:9,armor_exo:11})[item[1]]||2}:item[2]==='Шлем'?{condition:100,defense:({helmet_stalker:1,helmet_zarya:2,helmet_seva:3,helmet_bulat:4})[item[1]]||1}:item[2]==='Рюкзак'?{capacity:({backpack_field:65,backpack_expedition:80})[item[1]]||50}:{};addItem(item[1],item[0],item[2],item[5],item[4],x.qty);Object.assign(g.items.find(v=>v.id===item[1])||{},gear);}
  for(const x of sell){const item=g.items.find(v=>v.id===x.item);const payout=window.ZoneEconomy.saleTotal(item,x.qty);item.qty-=x.qty;g.money+=payout;if(item.qty<=0)g.items=g.items.filter(v=>v.id!==x.item);}
  log(`Сделка завершена: покупка ${totals.buy} RU, продажа ${totals.sell} RU.`);clearTradeBasket();save();renderTrade();return;
 }
 zoneSocket.emit('market:deal',{buy,sell});
}
function renderTrade(){
 const trader=g.loc==="cordon"?"Сидорович":g.loc==="bar"?"Бармен":"Полевой обмен";
 const traderRole=g.loc==="cordon"?"Торговец · Одиночки":g.loc==="bar"?"Бармен · Нейтрал":"Снабжение сектора";
 const name=$('traderName');if(name)name.textContent=trader;
 const role=$('tradeTraderRole');if(role)role.textContent=traderRole;
 const place=$('traderPlace');if(place)place.textContent=here().name+" · ассортимент зависит от поставок";
 const portrait=$('traderPortrait');if(portrait){portrait.src=g.loc==="cordon"?"/assets/portraits/stalker-03.webp":g.loc==="bar"?"/assets/portraits/stalker-08.webp":"/assets/portraits/stalker-12.webp";portrait.alt="Портрет: "+trader;}
 const playerName=$('tradePlayerName');if(playerName)playerName.textContent=playerDisplayName();
 const balanceText=(Number(g.money)||0).toLocaleString('ru-RU')+' RU';
 ['tradePlayerBalance','tradeBalance','tradeFooterBalance'].forEach(id=>{const el=$(id);if(el)el.textContent=balanceText;});
 const query=($('tradeSearch')?.value||'').trim().toLocaleLowerCase('ru-RU');
 const goods=tradeGoods().map((x,i)=>({...x,index:i})).filter(x=>(tradeCategory==='all'||(tradeCategory==='gear'?['Броня','Шлем','Рюкзак','Детектор','Артефакт','Оружие'].includes(x[2]):tradeCategory===x[2]))&&(!query||x[0].toLocaleLowerCase('ru-RU').includes(query)||x[2].toLocaleLowerCase('ru-RU').includes(query)));
 const shop=$('shop');if(shop)shop.innerHTML=goods.map(x=>`<article class="trade-item-card" draggable="true" ondragstart="tradeDragStart(event,'buy','${x.index}')"><div class="trade-item-art ${x[2]==='Броня'?'armor-art':x[2]==='Артефакт'?'artifact-art':''}">${itemGlyph({type:x[2]})}</div><div class="trade-item-copy"><b>${escapeHtml(x[0])}</b><small>${escapeHtml(x[2])} · ${x[4]} кг</small><span>${escapeHtml(x[5])}</span></div><div class="trade-item-action"><b>${x[3].toLocaleString('ru-RU')} RU</b><button onclick="addTradeBasket('buy','${x.index}')">В сделку</button></div></article>`).join('')||'<div class="mutedbox">В этой категории нет товаров.</div>';
 const owned=(g.items||[]).filter(x=>x.qty>0&&(!query||x.name.toLocaleLowerCase('ru-RU').includes(query)||x.type.toLocaleLowerCase('ru-RU').includes(query)));
 const sell=$('sellList');if(sell)sell.innerHTML=owned.map(x=>`<article class="trade-item-card" draggable="true" ondragstart="tradeDragStart(event,'sell','${escapeHtml(x.id)}')"><div class="trade-item-art">${itemGlyph(x)}</div><div class="trade-item-copy"><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.type)} · ×${x.qty} · ${x.weight} кг</small><span>Цена скупки: ${window.ZoneEconomy.saleUnitPrice(x).toLocaleString('ru-RU')} RU / шт.</span></div><div class="trade-item-action"><b>${(window.ZoneEconomy.saleUnitPrice(x)*x.qty).toLocaleString('ru-RU')} RU</b><button class="sell-trade-button" onclick="addTradeBasket('sell','${escapeHtml(x.id)}')">В сделку · Продать 1</button></div></article>`).join('')||'<div class="mutedbox">В рюкзаке пока нечего продавать.</div>';
 const weight=owned.reduce((sum,x)=>sum+(Number(x.weight)||0)*(Number(x.qty)||0),0);const weightEl=$('tradePlayerWeight');if(weightEl)weightEl.textContent=weight.toFixed(1)+' / 50.0 кг';
 const stockCount=$('tradeStockCount');if(stockCount)stockCount.textContent=goods.length+' позиций';
 const weapon=$('tradeWeapon');if(weapon)weapon.textContent=g.equipment?.weapon||'Не экипировано';const armor=$('tradeArmor');if(armor)armor.textContent=g.equipment?.suit||'Не экипировано';
 const quick=$('tradeQuickSlots');if(quick)quick.innerHTML=['Медицина','Еда','Артефакт','Детектор'].map((type,i)=>{const item=(g.items||[]).find(x=>x.type===type&&x.qty>0);return `<div class="trade-quick-slot">${item?itemGlyph(item):['✚','◒','✧','◉'][i]}<small>${item?escapeHtml(item.name):['Аптечка','Провизия','Артефакт','Детектор'][i]}</small></div>`}).join('');
 const stats=$('tradeStats');if(stats)stats.innerHTML=`<span>ЗДОРОВЬЕ <b>${Math.round(g.hp||0)}%</b></span><span>РАДИАЦИЯ <b>${Math.round(radiationLevel())}%</b></span><span>РЕПУТАЦИЯ <b>${g.rep||0}</b></span><span>ВЕС <b>${weight.toFixed(1)} кг</b></span>`;
 const totals=tradeBasketTotals();
 [['tradeSellValue',totals.sell],['tradeSellTotal',totals.sell],['tradeBuyValue',totals.buy],['tradeBuyTotal',totals.buy]].forEach(([id,value])=>{const el=$(id);if(el)el.textContent=value.toLocaleString('ru-RU')+' RU';});
 document.querySelectorAll('[data-trade-cat]').forEach(btn=>btn.classList.toggle('active',btn.dataset.tradeCat===tradeCategory));
 renderTradeBasket();
}

function influence(id){let l=g.locations.find(x=>x.id===id);if(!l||l.owner===g.faction)return;if(g.money<120)return alert("Недостаточно рублей.");g.money-=120;l.control=Math.min(100,l.control+15);if(l.control>=95){let old=l.owner;l.owner=g.faction;l.control=50;let f=g.factions.find(x=>x.name===old),m=g.factions.find(x=>x.name===g.faction);if(f)f.territories=Math.max(0,f.territories-1);if(m)m.territories++;log("Группировка "+g.faction+" установила влияние в районе "+l.name+".");news("Изменение контроля","Группировка "+g.faction+" усилила позиции в районе "+l.name+".")}else log("Влияние в районе "+l.name+" выросло до "+l.control+"%.");save();selectLocation(id)}
function factionIconMarkup(name){const map={'Одиночки':'loners','Долг':'duty','Свобода':'freedom','Бандиты':'bandits','Военные':'military','Учёные':'scientists','Наёмники':'mercenaries','Монолит':'monolith','Чистое небо':'clear-sky'};const slug=map[name]||'loners';return `<img class="faction-icon" src="/assets/factions/${slug}.svg" alt="Эмблема ${escapeHtml(name||'группировки')}" loading="lazy">`; }
let factionTab="overview",overviewRival="";
function setFactionTab(tab){factionTab=tab;document.querySelectorAll("[data-faction-tab]").forEach(b=>b.classList.toggle("active",b.dataset.factionTab===tab));document.querySelectorAll(".faction-tab-panel").forEach(p=>p.classList.toggle("active",p.id==={overview:"factionTabOverview",relations:"factionTabRelations",talks:"factionTabTalks"}[tab]));if(tab==="relations"||tab==="talks")renderDiplomacy()}
function renderFactions(){
 $("factionList").innerHTML=g.factions.map(f=>`<div class="item block"><div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;gap:9px;align-items:center"><span class="faction-emblem">${factionIconMarkup(f.name)}</span><b>${f.name}</b></div><span class="tag">${f.territories} террит.</span></div><div class="desc">${f.style} · ${f.members} участников</div><div class="small">Влияние ${f.influence}%</div><div class="bar"><i style="width:${f.influence}%"></i></div></div>`).join("");
 $("factionLeaders").innerHTML=g.factions.map(f=>{const x=f.leader||{name:"Неизвестно",title:"Нет единого лидера",canon:"",bio:""};return `<div class="leader-card"><div class="eyebrow">${escapeHtml(f.name)}</div><b>${escapeHtml(x.name)}</b><div class="desc">${escapeHtml(x.title)}</div><p class="small">${escapeHtml(x.bio)}</p><small class="muted">${escapeHtml(x.canon)}</small></div>`}).join("");
 $("relations").innerHTML=g.factions.filter(f=>f.name!==g.faction).map(f=>{const v=factionRelationValue(g.faction,f.name);const label=v<=-25?"Враждебность":v>=25?"Сотрудничество":"Нейтралитет";return `<div class="item"><span>${escapeHtml(f.name)} <small class="muted">· ${label}</small></span><b class="${v<0?'red':'gold'}">${v>0?"+":""}${v}</b></div>`}).join("");
}
function renderArchive(){
 const timeline=window.ZONE_CONTENT?.timeline||[];
 $("timelineList").innerHTML=timeline.map(x=>`<div class="timeline-entry"><span class="tag">${escapeHtml(x.era)}</span><b>${escapeHtml(x.title)}</b><p class="small">${escapeHtml(x.text)}</p></div>`).join("");
 const storyQuestFactions={story_swamp_signal:"Чистое небо",story_swamp_relay:"Чистое небо",story_yantar_echo:"Учёные",story_north_route:"Одиночки",story_pripyat_archive:"Одиночки"};
 const qs=(window.ZONE_CONTENT?.storyQuests||[]).filter(q=>(storyQuestFactions[q.id]||"Одиночки")===(g.faction||"Одиночки"));
 $("storyCampaign").innerHTML=qs.map(q=>{const state=g.quests.find(x=>x.id===q.id);return `<div class="item block"><div class="eyebrow">${escapeHtml(q.chapter)}</div><b>${escapeHtml(q.title)}</b><div class="desc">Выдал: ${escapeHtml(q.giver)} · ${q.reward} ₽ · ${q.xp} опыта</div><p class="small">${escapeHtml(q.desc)}</p><span class="tag">${state?.done?'Завершено':state?.accepted?'Активно':'Ожидает контакта'}</span></div>`}).join("");
}
let zoneMapZoom=1,zoneMapMode='zone',walkTimer=null,walkTarget=null,lastPositionSync=0,pendingSectorExit=null,zoneMapHasRendered=false,zoneMapDirty=true;
let zoneMapCenter=null,zoneMapPointer=null,zoneMapSuppressClick=false,mapRadiusTarget=null;
let playerFacing='down',playerMoving=false,playerFrame=0,playerMoveTarget=null;
// Collision rectangles are editable world-space bounds (1000 x 2000). These first-pass
// blockers cover the clearest large structures visible on the supplied satellite map.
const WORLD_OBSTACLES=[
 {x:305,y:22,w:330,h:132,name:'Северный промышленный комплекс'},
 {x:835,y:175,w:105,h:115,name:'Восточный промышленный комплекс'},
 {x:462,y:730,w:62,h:76,name:'Центральный объект'},
 {x:690,y:780,w:142,h:105,name:'Восточная застройка'},
 {x:42,y:758,w:112,h:88,name:'Западная застройка'},
 {x:120,y:1190,w:82,h:78,name:'Юго-западный объект'},
 {x:340,y:1280,w:105,h:72,name:'Южный комплекс'},
 {x:742,y:1400,w:72,h:72,name:'Восточный лагерь'}
];
// Coordinates are aligned to the ORIGINAL unlabeled satellite map (1000 x 2000).
// The second, labeled screenshot is used only as a geographic naming/boundary reference.
// Coordinates are aligned to the exact user-supplied labeled map (1000 x 2000).
const zoneMapNavigation=window.ZoneMapNavigation;
const zoneMapRenderer=window.ZoneMapRenderer;
const zoneMapData=window.ZoneMapData;
const zoneMapMotion=window.ZoneMapMotion.createMotionBatcher();
const zoneMapInteraction=window.ZoneMapInteraction;
const zoneSectorCoords=zoneMapNavigation.sectorCoords;
const zoneLinks=zoneMapNavigation.sectorLinks;
const MAP_REGIONS=zoneMapNavigation.mapRegions;
function mapRegionMarkup(){return zoneMapRenderer.renderRegions(MAP_REGIONS,escapeHtml)}
function currentMapView(){const me=playerWorldPosition(),frame=$('zoneMapFrame'),fullscreen=document.fullscreenElement===frame||frame?.classList.contains('map-fullscreen-fallback'),rect=$('zoneMap')?.getBoundingClientRect(),ratio=rect?.width&&rect?.height?rect.width/rect.height:16/9;return zoneMapNavigation.computeViewport({mode:zoneMapMode,zoom:zoneMapZoom,center:zoneMapCenter,player:me,fullscreen,aspectRatio:ratio})}
function mapZoom(step){const v=currentMapView();zoneMapCenter={x:v.x+v.w/2,y:v.y+v.h/2};const full=typeof document!=='undefined'&&(document.fullscreenElement===$('zoneMapFrame')||$('zoneMapFrame')?.classList.contains('map-fullscreen-fallback'));zoneMapZoom=step===0?1:Math.max(full?1:.25,Math.min(24,zoneMapZoom*(step>0?1.35:1/1.35)));zoneMapDirty=true;renderZoneMap()}
function mapPointerDown(ev){if(ev.target?.closest?.('.world-marker,.map-region,.map-sector,.map-entity-card'))return;const svg=$('zoneMapSvg');if(!svg)return;zoneMapPointer=zoneMapInteraction.beginPointerDrag(ev,currentMapView());if(zoneMapPointer)svg.setPointerCapture?.(ev.pointerId);}
function mapPointerMove(ev){const d=zoneMapPointer;if(!d)return;const el=$('zoneMapSvg'),r=el?.getBoundingClientRect(),result=zoneMapInteraction.movePointerDrag(d,ev,r);if(!result.matched)return;zoneMapPointer=result.state;if(result.center){zoneMapCenter=result.center;const v=currentMapView();el.setAttribute('viewBox',`${v.x} ${v.y} ${v.w} ${v.h}`);}}
function mapPointerUp(ev){const result=zoneMapInteraction.finishPointerDrag(zoneMapPointer,ev);if(!result.matched)return;zoneMapPointer=null;if(result.moved){zoneMapSuppressClick=true;setTimeout(()=>zoneMapSuppressClick=false,0);const coords=$('mapCoordinates');if(coords)coords.textContent=`${zoneMapMode==='zone'?'ВСЯ ЗОНА':'ЛОКАЦИЯ: '+(here()?.name||'—')} · ${Math.round(zoneMapZoom*100)}% · ОБЗОР КАРТЫ`;return;}mapPointer(ev);}
function toggleMapFullscreen(force=false){const frame=$('zoneMapFrame');if(!frame)return;if(document.fullscreenElement===frame||frame.classList.contains('map-fullscreen-fallback')){if(force)return;const exit=document.exitFullscreen?.();exit?.catch?.(error=>console.warn('Не удалось закрыть полноэкранную карту:',error));frame.classList.remove('map-fullscreen-fallback');zoneMapDirty=true;return;}if(frame.requestFullscreen){frame.requestFullscreen().then(()=>{frame.classList.remove('map-fullscreen-fallback');zoneMapDirty=true;renderZoneMap();}).catch(()=>{frame.classList.add('map-fullscreen-fallback');zoneMapDirty=true;renderZoneMap();});}else{frame.classList.add('map-fullscreen-fallback');zoneMapDirty=true;renderZoneMap();}}
function openZoneMapFullscreen(){view('world');zoneMapMode='zone';zoneMapZoom=1;zoneMapCenter={x:500,y:1000};zoneMapDirty=true;renderZoneMap();toggleMapFullscreen(true);}
document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement!==$('zoneMapFrame'))restoreNpcDialogueOverlay();zoneMapDirty=true;requestAnimationFrame(()=>{if($('world')?.classList.contains('active'))renderZoneMap();});});

function setMapMode(mode){zoneMapDirty=true;zoneMapMode=mode==='local'?'local':'zone';zoneMapCenter=null;$('mapModeZone')?.classList.toggle('active',zoneMapMode==='zone');$('mapModeLocal')?.classList.toggle('active',zoneMapMode==='local');$('mapHint').textContent=zoneMapMode==='local'?'Нажми на точку на карте. Сначала подтверди приказ — затем персонаж отправится туда.':'Общая карта: выбери сектор, чтобы подтвердить переход.';renderZoneMap();if(zoneMapMode==='zone')toggleMapFullscreen(true)}
// Клиентская копия графа переходов синхронизирована с src/systems/expedition.js.
const LOCAL_ROUTES=zoneMapNavigation.localRoutes;
const LOCAL_ROUTE_RISK=zoneMapNavigation.localRouteRisk;
function localRoute(from,to){return zoneMapNavigation.findLocalRoute(from,to,arguments[2]||'safe')}
function handleMapSectorSelect(id){showMapSectorCard(id||g.loc);}
function beginMapSectorTravel(id){
 const l=(g.locations||[]).find(x=>x.id===id);if(!l)return;
 if(id===g.loc){closeMapEntityCard();return;}
 if(activePlayerSquad&&activePlayerSquad.leader!==zonePlayerId)return alert('Маршрутом отряда управляет командир.');
 const dest=$('expeditionDestination');if(dest)dest.value=id;zoneMapMode='zone';zoneMapCenter=null;zoneMapDirty=true;startExpedition();updateMoveOrderStatus(`Прокладываю маршрут в «${l.name}»…`);
}
function showMapSectorCard(id){
 const sector=(g.locations||[]).find(l=>l.id===id),card=$('mapEntityCard');if(!sector||!card)return;
 const npcSource=serverWorld?.npcState?Object.values(serverWorld.npcState):(g.npcs||[]);
 const npcs=npcSource.filter(n=>(n.location||n.loc)===id),alive=npcs.filter(n=>n.alive!==false),dead=npcs.length-alive.length;
 const points=Object.values(serverWorld?.keyPoints||{}).filter(p=>p.location===id),localPoints=g.keyPoints?.[id]||[];
 const anomalies=(ecologyData().anomalies||[]).filter(a=>a.location===id),mutants=(ecologyData().mutantPacks||[]).filter(p=>p.location===id&&Number(p.count)>0);
 const battles=(serverWorld?.battlefronts||[]).filter(b=>b.location===id&&b.status==='active');
 const artifacts=ensureArtifactSites().filter(a=>a.location===id&&!a.collected),players=(onlinePlayers||[]).filter(p=>p.location===id);
 const factionCounts=new Map();for(const n of alive)factionCounts.set(n.faction||'Неизвестно',(factionCounts.get(n.faction||'Неизвестно')||0)+1);
 const factionSummary=[...factionCounts].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([f,c])=>`${escapeHtml(f)} — ${c}`).join(' · ')||'Нет подтверждённых контактов';
 const knownPoints=localPoints.map(p=>`<li>${escapeHtml(p.name)} <small>· ${escapeHtml(p.kind||'точка')} · ${p.discovered?escapeHtml(p.desc||'изучено'):'не разведано'}</small></li>`).join('');
 const strategicSummary=points.length?points.slice(0,8).map(p=>`<li><b>${escapeHtml(p.name||'Объект')}</b> · ${escapeHtml(p.owner||'неизвестно')} · ${Math.round(Number(p.control)||0)}%</li>`).join(''):'<li>Данные о стратегических объектах пока не получены.</li>';
 card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>СЕКТОР · ${escapeHtml(sector.name||locationName(id))}</b><button type="button" onclick="closeMapEntityCard()" aria-label="Закрыть">×</button></div>
 <div class="map-entity-meta">Контроль территории: <b>${escapeHtml(sector.owner||'Неизвестно')}</b> · уровень контроля ${Math.round(Number(sector.control)||0)}% · риск ${escapeHtml(sector.risk||'—')}</div><p class="small muted">${escapeHtml(sector.desc||'Сведения о секторе обновляются по мере разведки и активности местных группировок.')}</p>
 <div class="sector-intel-grid"><div><b>${alive.length}</b><small>живых НПС</small></div><div><b>${players.length}</b><small>игроков онлайн</small></div><div><b>${anomalies.length}</b><small>аномалий</small></div><div><b>${mutants.reduce((sum,p)=>sum+(Number(p.count)||0),0)}</b><small>мутантов</small></div><div><b>${battles.length}</b><small>активных боёв</small></div><div><b>${artifacts.length}</b><small>сигналов артефактов</small></div><div><b>${localPoints.length+points.length}</b><small>точек интереса</small></div></div>
 <h4>Состав сталкеров</h4><p class="small muted">${factionSummary}${dead?` · погибших: ${dead}`:''}</p>
 <h4>Стратегические объекты</h4><ul class="sector-intel-list">${strategicSummary}</ul>
 <h4>Известные точки интереса</h4><ul class="sector-intel-list">${knownPoints||'<li>Неизученные ориентиры. Проведи полевую разведку, чтобы получить координаты.</li>'}</ul>
 <div class="map-entity-meta">Экология: ${anomalies.length} аномальных полей · ${mutants.length} групп мутантов · ${artifacts.length} сигналов находок</div>
 <div class="map-player-actions">${id===g.loc?'<button type="button" disabled>Ты находишься в этом секторе</button>':`<button type="button" onclick="beginMapSectorTravel('${String(id).replace(/[^a-z0-9_-]/gi,'')}')">Проложить маршрут в сектор</button>`}<button type="button" onclick="selectLocation('${String(id).replace(/[^a-z0-9_-]/gi,'')}')">Открыть подробную карточку сектора</button></div>`;
}

function sectorCenter(id){return zoneMapNavigation.sectorCenter(id)}
function playerWorldPosition(){return zoneMapNavigation.resolvePlayerPosition(g,Date.now())}
function playerDotMarkup(p){return `<g data-map-key="player:self" id="playerMapMarker" class="world-marker marker-self map-player-hit" transform="translate(${p.x} ${p.y}) scale(.42)" role="button" tabindex="0" aria-label="Твоё положение. Нажми, чтобы увидеть ближайших игроков" onclick="showNearbyPlayersCard()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showNearbyPlayersCard()}"><circle class="marker-hit-area" r="12"/><circle class="marker-pulse" r="7"/><circle class="marker-dot" r="3.2"/><circle class="marker-center" r="1.1"/></g>`}
function playerMapPointMarkup(player,point){const id=String(player.id||'').replace(/[^a-zA-Z0-9_-]/g,'');const name=escapeHtml(player.name||'Игрок');return `<g data-map-key="player:${id}" class="world-marker marker-player map-player-hit" transform="translate(${point[0]} ${point[1]}) scale(.42)" role="button" tabindex="0" aria-label="Игрок ${name}" onclick="showMapPlayerCard('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showMapPlayerCard('${id}')}"><circle class="marker-hit-area" r="12"/><circle class="marker-pulse" r="7"/><circle class="marker-dot" r="3.2"/><title>${name} · ${escapeHtml(locationName(player.location))}</title></g>`}
function playerDistanceExact(player){const me=playerWorldPosition();if(!Number.isFinite(Number(player?.x))||!Number.isFinite(Number(player?.y)))return null;return Math.hypot(Number(player.x)-me.x,Number(player.y)-me.y);}
function playerDistanceMeters(player){const d=playerDistanceExact(player);return d===null?null:Math.round(d);}
function showNearbyPlayersCard(){const card=$('mapEntityCard');if(!card)return;const nearby=(onlinePlayers||[]).filter(p=>p.id!==zonePlayerId&&p.location===g.loc).map(p=>({p,d:playerDistanceMeters(p)})).sort((a,b)=>(a.d??Infinity)-(b.d??Infinity));const npcs=(g.npcs||[]).filter(n=>n.alive!==false&&(n.loc||n.location)===g.loc).map(n=>({n,d:npcDistance(n)})).filter(x=>x.d<=8).sort((a,b)=>a.d-b.d);card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>ЛЮДИ РЯДОМ · ${nearby.length+npcs.length}</b><button type="button" onclick="closeMapEntityCard()" aria-label="Закрыть">×</button></div><div class="map-entity-meta">Сталкеры в секторе и NPC в радиусе разговора 8 метров.</div><h4>Игроки</h4>${nearby.length?nearby.map(({p,d})=>`<button type="button" class="map-player-row" onclick="showMapPlayerCard('${String(p.id).replace(/[^a-zA-Z0-9_-]/g,'')}')"><span><b>${escapeHtml(p.name||'Сталкер')}</b><small>${escapeHtml(p.faction||'Неизвестная группировка')}</small></span><em>${d===null?'нет координат':d+' м'}</em></button>`).join(''):'<div class="mutedbox small">Других игроков пока нет.</div>'}<h4>NPC рядом · до 8 м</h4>${npcs.length?npcs.map(({n,d})=>`<div class="map-player-row"><span><b>${escapeHtml(n.name||'Сталкер')}</b><small>${escapeHtml(n.role||'NPC')} · ${escapeHtml(n.faction||'')}</small></span><em>${Math.round(d)} м</em><button type="button" onclick="startTalk('${String(n.id).replace(/[^a-zA-Z0-9_-]/g,'')}')">Поговорить</button></div>`).join(''):'<div class="mutedbox small">Пока нет NPC в радиусе 8 метров.</div>'}`;}
function showMapPlayerCard(playerId){const p=(onlinePlayers||[]).find(x=>x.id===playerId&&x.id!==zonePlayerId);const card=$('mapEntityCard');if(!p||!card)return;const d=playerDistanceMeters(p);card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>СТАЛКЕР · ${escapeHtml(p.name||'Игрок')}</b><button type="button" onclick="closeMapEntityCard()" aria-label="Закрыть">×</button></div><div class="map-entity-meta">${escapeHtml(p.faction||'Неизвестная группировка')} · ${escapeHtml(locationName(p.location))} · ${d===null?'расстояние неизвестно':d+' м от тебя'}</div><div class="map-player-actions"><button type="button" onclick="openMapPlayerMessage('${String(p.id).replace(/[^a-zA-Z0-9_-]/g,'')}')">✉ Поговорить</button><button type="button" onclick="openMapPlayerTrade('${String(p.id).replace(/[^a-zA-Z0-9_-]/g,'')}')">⇄ Торговать</button><button type="button" onclick="squadAction('invite','${String(p.id).replace(/[^a-zA-Z0-9_-]/g,'')}')">＋ Пригласить в отряд</button><button type="button" onclick="friendRequest('${String(p.id).replace(/[^a-zA-Z0-9_-]/g,'')}')">★ Добавить в друзья</button></div>`;}
function openMapPlayerMessage(id){closeMapEntityCard();view('multiplayer');openPlayerDM(id);}
function openMapPlayerTrade(id){const p=onlinePlayers.find(x=>x.id===id&&x.location===g.loc);if(!p)return alert('Игрок должен находиться в твоём секторе.');const exactDistance=playerDistanceExact(p),d=playerDistanceMeters(p);if(exactDistance===null||exactDistance>8)return alert('Для торговли подойди к игроку на расстояние не более 8 метров.');const card=$('mapEntityCard');if(!card)return;const allowed=new Set(['med','bread','bolt','scrap','bandage','anti_rad','painkillers','trauma_kit','artifact','canned','sausage','condensed','water','tea','ration','energy_drink','chocolate','nuts','smoked_meat','artifact_medusa','artifact_flower','artifact_dummy','artifact_meat','artifact_flash','artifact_nightstar','artifact_soul','artifact_goldfish','armor_leather','armor_stalker','armor_zarya','armor_seva','armor_bulat','armor_exo','mutant_trophy','weapon_pm','weapon_aks74u','weapon_toz34','weapon_ak74','weapon_vintar']);const items=(g.items||[]).filter(x=>x.qty>0&&allowed.has(x.id));card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>ОБМЕН С ИГРОКОМ · ${escapeHtml(p.name||'Сталкер')}</b><button type="button" onclick="closeMapEntityCard()" aria-label="Закрыть">×</button></div><div class="map-entity-meta">${d} м от тебя · игрок должен подтвердить предложение. Это отдельная торговля между игроками, не магазин NPC.</div>${items.length?`<label class="small" for="mapTradeItem">Предмет из твоего рюкзака</label><select id="mapTradeItem" class="field">${items.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)} · ${x.qty} шт.</option>`).join('')}</select><div class="map-player-trade-fields"><label>Количество<input id="mapTradeQty" class="field" type="number" min="1" max="99" value="1"></label><label>Цена, ₽<input id="mapTradePrice" class="field" type="number" min="0" max="1000000" value="0"></label></div><button type="button" class="map-trade-submit" onclick="sendMapPlayerTrade('${String(id).replace(/[^a-zA-Z0-9_-]/g,'')}')">Отправить предложение</button>`:'<div class="mutedbox small">В рюкзаке нет предметов, доступных для обмена.</div>'}<button type="button" class="quiet-action" onclick="showMapPlayerCard('${String(id).replace(/[^a-zA-Z0-9_-]/g,'')}')">Назад к игроку</button>`;}
function sendMapPlayerTrade(id){if(!zoneSocket?.connected)return alert('Нет соединения с сервером.');const item=$('mapTradeItem')?.value,qty=Number($('mapTradeQty')?.value),price=Number($('mapTradePrice')?.value);if(!item)return alert('Выбери предмет.');if(!Number.isInteger(qty)||qty<1||qty>99||!Number.isInteger(price)||price<0||price>1000000)return alert('Проверь количество и цену.');zoneSocket.emit('trade:offer',{to:id,item,qty,price});}

function npcHeading(n,index=0){const d=n.direction??n.facing??n.heading;const named={up:0,north:0,right:90,east:90,down:180,south:180,left:270,west:270};return Number.isFinite(Number(d))?Number(d):named[String(d||'').toLowerCase()]??((index*47)%360)}
function mapPoint(x,y,cls,label,extra='',heading=0){const fighting=String(cls||'').includes('marker-in-combat'),arrow=['marker-friendly','marker-neutral','marker-enemy'].some(c=>String(cls||'').split(' ').includes(c))?`<path class="marker-direction" transform="scale(.34) rotate(${heading})" d="M0 -9 L-2.7 -4 L0 -5.5 L2.7 -4 Z"/>`:``;return `<g class="world-marker ${cls||''}" transform="translate(${x} ${y}) scale(.42)" ${extra}><circle class="marker-hit-area" r="15"/><circle class="marker-pulse" r="7"/>${arrow}<circle class="marker-dot" r="3.2"/>${fighting?'<circle class="combat-insignia-bg" cx="9" cy="-10" r="7"/><text class="combat-insignia" x="9" y="-7">⚔</text>':''}<title>${escapeHtml(label||'Отметка')}${fighting?' · В БОЮ':arrow?' · направление НПС':''}</title></g>`}
const FACTION_COLORS=Object.freeze({'Одиночки':'#d7c28a','Долг':'#c94b42','Свобода':'#6fae55','Бандиты':'#252525','Военные':'#a9a66b','Учёные':'#55a9c9','Наёмники':'#c49a55','Монолит':'#8b78c9','Чистое небо':'#55b7a7','Ренегаты':'#8a6650'});
function factionColor(faction){return FACTION_COLORS[String(faction||'')]||'#b7b7a0';}
function mapSquadPoint(x,y,cls,label,count,extra='',heading=0,names='',inCombat=false){const arrow=`<path class="marker-direction" transform="scale(.34) rotate(${heading})" d="M0 -9 L-2.7 -4 L0 -5.5 L2.7 -4 Z"/>`;return `<g class="world-marker world-squad-marker ${cls||''} ${inCombat?'marker-in-combat':''}" transform="translate(${x} ${y}) scale(.48)" ${extra} role="button" tabindex="0" aria-label="${escapeHtml(label)}"><circle class="marker-pulse" r="8"/>${arrow}<circle class="marker-dot" r="5"/>${inCombat?'<circle class="combat-insignia-bg" cx="9" cy="-9" r="7"/><text class="combat-insignia" x="9" y="-6">⚔</text>':''}<title>${escapeHtml(label)} · ${escapeHtml(names)}${inCombat?' · В БОЮ':''}</title></g>`}
function isHostileNpcFaction(faction){if(!faction||faction===g.faction)return false;if(faction==='Монолит'||g.faction==='Монолит')return true;return factionRelationValue(g.faction,faction)<=-25;}
function npcMarkerClass(n){if(n.faction===g.faction)return 'marker-friendly';if(isHostileNpcFaction(n.faction))return 'marker-enemy';const f=(g.factions||[]).find(x=>x.name===n.faction);if(Number(n.relationship??0)<-10)return 'marker-enemy';return 'marker-neutral'}
function sectorMarkerPosition(id,index=0){const q=zoneSectorCoords[id];if(!q)return null;const angle=index*2.399963;const radius=18+((index%3)*9);return [q[0]+Math.cos(angle)*radius,q[1]+Math.sin(angle)*radius]}
function hashMapSeed(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const keyPointPositionCache=new Map();
function keyPointMapPosition(point,index=0){
 const loc=point?.location||'cordon',all=Object.values(serverWorld?.keyPoints||{}).filter(x=>x.location===loc).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const cacheKey=loc+'|'+all.map(x=>x.id).join(',');let positions=keyPointPositionCache.get(cacheKey);
 if(!positions){const region=MAP_REGIONS.find(x=>x.id===loc),center=zoneSectorCoords[loc]||zoneSectorCoords.cordon,cx=region?region.x+region.w/2:center[0],cy=region?region.y+region.h/2:center[1],w=Math.max(190,(region?.w||190)-30),h=Math.max(160,(region?.h||160)-30),left=cx-w/2,top=cy-h/2,placed=[];for(let i=0;i<all.length;i++){let seed=hashMapSeed(all[i].id+'|zone-point-layout'),rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},candidate=null;for(let attempt=0;attempt<240;attempt++){const q={x:left+20+rand()*Math.max(1,w-40),y:top+20+rand()*Math.max(1,h-40)};if(placed.every(p=>Math.hypot(p.x-q.x,p.y-q.y)>=38)){candidate=q;break;}}if(!candidate){const cols=4,rows=Math.ceil(all.length/cols),col=i%cols,row=Math.floor(i/cols);candidate={x:left+22+(col+.5)*(w-44)/cols,y:top+22+(row+.5)*(h-44)/rows};}placed.push(candidate);}positions=new Map(all.map((x,i)=>[x.id,[placed[i].x,placed[i].y]]));keyPointPositionCache.set(cacheKey,positions);if(keyPointPositionCache.size>40)keyPointPositionCache.delete(keyPointPositionCache.keys().next().value);}
 const fallback=zoneSectorCoords[loc]||zoneSectorCoords.cordon;return positions.get(point?.id)||[fallback[0]+(index%3-1)*42,fallback[1]+(Math.floor(index/3)-1)*38];
}
const npcMapPositions=new Map();
function npcMapPosition(n,index=0){
 // Server coordinates are authoritative for rendering AND interaction; never drift them locally.
 if(n&&n.x!==null&&n.x!==undefined&&n.y!==null&&n.y!==undefined&&Number.isFinite(Number(n.x))&&Number.isFinite(Number(n.y)))return [Number(n.x),Number(n.y)];
 const id=String(n?.id||n?.name||('npc_'+index)),loc=n?.location||n?.loc||'cordon',center=zoneSectorCoords[loc]||zoneSectorCoords.cordon;
 let pos=npcMapPositions.get(id);
 if(!pos||pos.loc!==loc){let seed=hashMapSeed(id+'|'+loc),rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const angle=rand()*Math.PI*2,radius=28+rand()*112;pos={loc,x:center[0]+Math.cos(angle)*radius,y:center[1]+Math.sin(angle)*radius};npcMapPositions.set(id,pos)}
 return [pos.x,pos.y];
}
function npcInteractionPosition(n){const p=npcMapPosition(n);return {x:p[0],y:p[1]};}
function npcDistance(n){const p=playerWorldPosition(),q=npcInteractionPosition(n);return Math.hypot(p.x-q.x,p.y-q.y);}
function npcInInteractionRange(n){return !!n&&(n.loc||n.location)===g.loc&&npcDistance(n)<=8;}
function npcInCombatRange(n){return !!n&&(n.loc||n.location)===g.loc&&npcDistance(n)<=18;}
function showMapNpcRadius(id){const n=npcBy(id);if(!n)return;mapRadiusTarget=id;zoneMapMode=(n.loc||n.location)===g.loc?'local':'zone';const p=npcMapPosition(n);zoneMapCenter={x:p[0],y:p[1]};zoneMapDirty=true;renderZoneMap();}
function driftNpcMapPositions(){
 for(const n of (g.npcs||[])){if(n.alive===false||Number.isFinite(n.x)&&Number.isFinite(n.y))continue;const p=npcMapPosition(n);const state=npcMapPositions.get(String(n.id||n.name));if(!state)continue;state.phase+=.22;const c=zoneSectorCoords[state.loc]||zoneSectorCoords.cordon;const radius=Math.hypot(state.x-c[0],state.y-c[1]);const angle=Math.atan2(state.y-c[1],state.x-c[0])+.035;const r=Math.max(24,Math.min(145,radius+Math.sin(state.phase)*1.4));state.x=c[0]+Math.cos(angle)*r;state.y=c[1]+Math.sin(angle)*r;}
 if($('world')?.classList.contains('active'))renderZoneMap();
}
// Map markers are updated only when the map is opened or authoritative world data arrives;
// avoid rebuilding hundreds of SVG nodes on a background timer (especially on mobile).

function ensureArtifactSites(){g.artifactSites ||= [];return g.artifactSites;}
function artifactPosition(location){const c=zoneSectorCoords[location]||zoneSectorCoords.cordon;const angle=Math.random()*Math.PI*2,r=38+Math.random()*105;return {x:Math.max(12,Math.min(988,c[0]+Math.cos(angle)*r)),y:Math.max(12,Math.min(1988,c[1]+Math.sin(angle)*r))};}
function showMapCoopArtifact(id){const e=(serverWorld?.artifactExpeditions||[]).find(x=>x.id===id&&(x.status==='searching'||x.status==='ready'));const card=$('mapEntityCard');if(!e||!card)return;const joined=(e.participants||[]).some(p=>p.id===zonePlayerId);card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>СОВМЕСТНЫЙ СИГНАЛ</b><button type="button" onclick="closeMapEntityCard()">×</button></div><div class="map-entity-meta">${escapeHtml(locationName(e.location))} · ${e.participants?.length||0}/4 участников</div><p class="small muted">${escapeHtml(e.artifactName||'Неизвестная сигнатура')}. Игроки одной экспедиции смогут получить общую находку после завершения поиска.</p><div class="map-player-actions">${e.location!==g.loc?`<button type="button" onclick="travel('${e.location}')">Отправиться в сектор</button>`:joined?`<button type="button" onclick="claimCoopArtifactExpedition('${e.id}')" ${e.status!=='ready'?'disabled':''}>Завершить поиск и получить находку</button>`:`<button type="button" onclick="joinCoopArtifactExpedition('${e.id}')">Присоединиться</button>`}</div>`;}
function showMapArtifact(id){const site=ensureArtifactSites().find(x=>x.id===id&&x.discovered&&!x.collected);if(!site)return;const sameSector=site.location===g.loc,d=sameSector?Math.hypot(playerWorldPosition().x-site.x,playerWorldPosition().y-site.y):null;const card=$('mapEntityCard');if(!card)return;card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>СИГНАЛ АРТЕФАКТА</b><button type="button" onclick="closeMapEntityCard()">×</button></div><div class="map-entity-meta">${escapeHtml(locationName(site.location))} · ${sameSector?`${Math.round(d)} м`:'другой сектор'} · ${escapeHtml(site.rarity||'неизвестная сигнатура')}</div><p class="small muted">Детектор зафиксировал объект. ${sameSector?'Подойди к отметке, чтобы подобрать находку.':'Сначала доберись до этого сектора обычной экспедицией.'}</p><div class="map-player-actions">${sameSector?(d<=14?`<button type="button" onclick="collectArtifactSite('${site.id}')">Подобрать артефакт</button>`:`<button type="button" onclick="approachArtifactSite('${site.id}')">Подойти к сигналу</button>`):`<button type="button" onclick="travel('${site.location}')">Начать экспедицию</button>`}</div>`;if(sameSector)zoneMapCenter={x:site.x,y:site.y};}
function approachArtifactSite(id){const site=ensureArtifactSites().find(x=>x.id===id&&x.discovered&&!x.collected);if(!site)return;if(site.location!==g.loc){travel(site.location);return;}issueApproachOrder({x:site.x,y:site.y},'artifact',id);showMapArtifact(id);}
function collectArtifactSite(id){const site=ensureArtifactSites().find(x=>x.id===id&&x.discovered&&!x.collected);if(!site)return;if(site.location!==g.loc)return alert('Артефакт находится в другом секторе. Сначала доберись туда.');const d=Math.hypot(playerWorldPosition().x-site.x,playerWorldPosition().y-site.y);if(d>14)return alert('Подойди ближе к сигналу — не более 14 метров.');const def=artifactDefinitions[site.artifactId];if(!def)return;addItem(def.id,def.name,'Артефакт',def.desc,def.weight,def.value);const item=g.items.find(x=>x.id===def.id);if(item){item.effects={...def.effects};item.rarity=def.rarity;}site.collected=true;site.collectedAt=Date.now();g.flags.foundArtifact=true;g.xp+=28;livingNews('Артефакт найден',`В секторе «${locationName(site.location)}» подобран артефакт «${def.name}».`);log(`Найден артефакт «${def.name}». Его свойства доступны в инвентаре.`);save();renderInventory();closeMapEntityCard();renderZoneMap();}
function renderZoneMap(){
 const esc=s=>escapeHtml(String(s??'')),centers=zoneSectorCoords;
 const edges=zoneLinks.map(([a,b])=>{const A=centers[a],B=centers[b];return `<path class="map-route-line" d="M${A[0]} ${A[1]} Q${(A[0]+B[0])/2+20} ${(A[1]+B[1])/2-15} ${B[0]} ${B[1]}"/>`}).join('');
 const regions=zoneMapMode==='zone'?mapRegionMarkup():'';
 const me=playerWorldPosition();let overlays='',npcOverlays='',dynamicOverlays='';
 const eco=ecologyData();
 const mapData=zoneMapData.prepareMapData({mode:zoneMapMode,location:g.loc,npcState:serverWorld?.npcState,npcs:g.npcs,keyPoints:serverWorld?.keyPoints,battlefronts:serverWorld?.battlefronts,convoys:serverWorld?.convoys,mutantPacks:eco.mutantPacks,anomalies:eco.anomalies,onlinePlayers,playerId:zonePlayerId,artifactExpeditions:serverWorld?.artifactExpeditions,artifactSites:ensureArtifactSites(),stashes:currentStashes});
 const living=mapData.livingNpcs,squadBuckets=mapData.squadBuckets;
 if(zoneMapMode==='zone'){
  // Overview clusters squads to keep the full-Zone map light; the squad card exposes every member.
  npcOverlays+=[...squadBuckets.values()].map((members,i)=>{const lead=members[0],pts=members.map(n=>npcMapPosition(n,i));const x=pts.reduce((a,p)=>a+p[0],0)/pts.length,y=pts.reduce((a,p)=>a+p[1],0)/pts.length,cls=npcMarkerClass(lead),label=`Отряд «${lead.squadName||lead.squadId||'сталкеры'}» · ${members.length} бойца(ов) · ${lead.faction||'нейтралы'} · ${locationName(lead.location||lead.loc)}`,key=lead.squadId||lead.id;return mapSquadPoint(x,y,cls,label,members.length,`style="color:${factionColor(lead.faction)}" data-npc-id="${esc(lead.id)}" onclick="showMapNpcRadius('${esc(lead.id)}');showMapSquad('${esc(key)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showMapNpcRadius('${esc(lead.id)}');showMapSquad('${esc(key)}')}"`,npcHeading(lead,i),members.map(n=>n.name).join(', '),members.some(n=>n.action==='combat'||n.behavior==='combat'));}).join('');
 }else{
  // Local map shows individually selectable stalkers with their own identity and dialogue.
  npcOverlays+=living.map((n,i)=>{const p=npcMapPosition(n,i),cls=npcMarkerClass(n),activity=({campfire:'у костра',guard:'на посту',patrol:'патрулирует',travel:'в пути',assault:'выдвигается',mission:'выполняет приказ',combat:'в бою',retreat:'отступает',rest:'отдыхает',await_rescue:'ждёт эвакуации',rescue_escort:'эвакуируется'})[n.behavior||n.action]||'в секторе',label=`${n.name||'Сталкер'} · ${n.role||'сталкер'} · ${n.faction||'нейтралы'} · ${locationName(n.location||n.loc)} · ${activity}`;const fighting=n.action==='combat'||n.behavior==='combat';return mapPoint(p[0],p[1],cls+(fighting?' marker-in-combat':''),label+(fighting?' · ПЕРЕСТРЕЛКА':''),`data-npc-id="${esc(n.id)}" role="button" tabindex="0" aria-label="${esc(label)}" onclick="event.stopPropagation();selectMapNpc('${esc(n.id)}')" onpointerdown="event.stopPropagation()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();selectMapNpc('${esc(n.id)}')}"`,npcHeading(n,i))+ (fighting?'':'');}).join('');
 }
 {
  const strategicPoints=mapData.strategicPoints;
  for(const [i,point] of strategicPoints.entries()){
   const q=keyPointMapPosition(point,i);if(!q)continue;
   const icon=({base:'⌂',checkpoint:'▣',industry:'⚙',anomaly:'✧',research:'⚗',trade:'₽',supply:'▤',relay:'⌁'})[point.type]||'◆';
   const title=`${point.name} · ${point.owner} · контроль ${Math.round(Number(point.control)||0)}%`;
   overlays+=`<g class="world-marker marker-keypoint" role="button" tabindex="0" aria-label="${esc(title)}" onclick="event.stopPropagation();showMapKeyPoint('${esc(point.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showMapKeyPoint('${esc(point.id)}')}" style="--faction-color:${factionColor(point.owner)};color:${factionColor(point.owner)}" transform="translate(${q[0]} ${q[1]})"><circle r="6"/><text text-anchor="middle" y="2.5">${icon}</text><title>${esc(title)}</title></g>`;
  }
 }
 const activeBattles=mapData.activeBattles;
 for(const [i,battle] of activeBattles.entries()){const q=sectorMarkerPosition(battle.location,68+i);if(q)dynamicOverlays+=`<g data-map-key="battle:${esc(battle.id)}" class="world-marker marker-battle-hotspot" role="button" tabindex="0" aria-label="Перестрелка ${esc(battle.attacker)} против ${esc(battle.defender)}" onclick="showMapBattle('${esc(battle.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showMapBattle('${esc(battle.id)}')}" transform="translate(${q[0]} ${q[1]})"><circle class="battle-hotspot-pulse" r="24"/><circle class="battle-hotspot-core" r="13"/><text class="battle-hotspot-icon" text-anchor="middle" y="6">⚔</text><title>АКТИВНЫЙ БОЙ · ${esc(battle.attacker)} против ${esc(battle.defender)} · потери ${Number(battle.losses)||0}</title></g>`;}
 for(const c of mapData.convoys){const q=sectorMarkerPosition(c.location,12);if(q)dynamicOverlays+=mapPoint(q[0]+7,q[1]+7,'marker-convoy',`Караван ${c.faction} · ${c.status}`,`data-map-key="convoy:${esc(c.id)}"`);}
 for(const [i,pack] of mapData.mutantPacks.entries()){const q=Number.isFinite(Number(pack.x))&&Number.isFinite(Number(pack.y))?[Number(pack.x),Number(pack.y)]:sectorMarkerPosition(pack.location,20+i);if(q)dynamicOverlays+=`<g data-map-key="mutant:${esc(pack.id)}" class="world-marker marker-mutant" data-mutant-id="${esc(pack.id)}" role="button" tabindex="0" aria-label="Мутанты: ${esc(pack.species)}, ${Number(pack.count)||0}" onclick="showMapMutants('${esc(pack.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showMapMutants('${esc(pack.id)}')} " transform="translate(${q[0]-10} ${q[1]+9}) scale(.42)"><circle class="marker-pulse" r="9"/><circle class="marker-dot" r="5"/><text text-anchor="middle" y="3">☣</text><title>${esc(pack.species)} ×${pack.count} · ${locationName(pack.location)} · агрессия ${pack.aggression}%</title></g>`;}
 for(const [i,a] of mapData.anomalies.entries()){const q=sectorMarkerPosition(a.location,45+i);if(q)overlays+=`<g class="world-marker marker-anomaly" transform="translate(${q[0]+10} ${q[1]-9}) scale(.42)"><circle r="7"/><text text-anchor="middle" y="3">✧</text><title>${esc(a.kind)} · ${locationName(a.location)} · опасность ${a.danger}%</title></g>`;}
 dynamicOverlays+=mapData.onlinePlayers.map((p,i)=>{const q=Number.isFinite(p.x)&&Number.isFinite(p.y)?[p.x,p.y]:sectorMarkerPosition(p.location,i+2);return q?playerMapPointMarkup(p,q):''}).join('');
 const sharedArtifactSites=mapData.sharedArtifactSites;
 dynamicOverlays+=sharedArtifactSites.map(a=>`<g data-map-key="coop-artifact:${esc(a.id)}" class="world-marker marker-artifact marker-artifact-coop" role="button" tabindex="0" aria-label="Совместная экспедиция" onclick="showMapCoopArtifact('${a.id}')" transform="translate(${a.x} ${a.y})"><circle r="10"/><text text-anchor="middle" y="3">✧</text><title>Совместная экспедиция · ${locationName(a.location)}</title></g>`).join('');
 const artifactSites=mapData.artifactSites;
 dynamicOverlays+=artifactSites.map(a=>`<g data-map-key="artifact:${esc(a.id)}" class="world-marker marker-artifact" role="button" tabindex="0" aria-label="Сигнал артефакта" onclick="showMapArtifact('${a.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showMapArtifact('${a.id}')}" transform="translate(${a.x} ${a.y})"><circle r="8"/><text text-anchor="middle" y="3">✧</text><title>Сигнал артефакта · ${locationName(a.location)}</title></g>`).join('');
 const caches=mapData.caches;
 dynamicOverlays+=caches.map(st=>mapPoint(Number(st.x),Number(st.y),'marker-cache',`Тайник · ${locationName(st.location)}`,`data-map-key="stash:${esc(st.id)}" role="button" tabindex="0" aria-label="Тайник" onclick="showMapStash('${esc(st.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showMapStash('${esc(st.id)}')}"`)).join('');
 const selectedNpc=mapRadiusTarget?npcBy(mapRadiusTarget):null;
 const npcRoutes=selectedNpc?(()=>{const route=npcRoutePoints(selectedNpc);return route.length>1?`<polyline class="npc-route-line npc-route-selected" points="${route.map(v=>v.join(',')).join(' ')}"><title>Маршрут: ${esc(selectedNpc.name||'сталкер')}</title></polyline>`:''})():'';
 const expeditionTarget=g.expedition?.status==='travelling'&&g.expedition.path?.[g.expedition.index+1]?sectorCenter(g.expedition.path[g.expedition.index+1]):null;const moveRoute=expeditionTarget?`<path class="player-waypoint-route" d="M${me.x} ${me.y} L${expeditionTarget[0]} ${expeditionTarget[1]}"/><g class="player-waypoint" transform="translate(${expeditionTarget[0]} ${expeditionTarget[1]})"><circle r="10"/><path d="M-5 0H5M0 -5V5"/></g>`:playerMoveTarget?`<path class="player-waypoint-route" d="M${me.x} ${me.y} L${playerMoveTarget.x} ${playerMoveTarget.y}"/><g class="player-waypoint" transform="translate(${playerMoveTarget.x} ${playerMoveTarget.y})"><circle r="8"/><path d="M-4 0H4M0 -4V4"/></g>`:'';
 const meDot=playerDotMarkup(me);
 const v=currentMapView(),view=`${v.x} ${v.y} ${v.w} ${v.h}`;
 const rangeOverlay=mapRadiusTarget&&npcBy(mapRadiusTarget)?(()=>{const q=npcMapPosition(npcBy(mapRadiusTarget));return `<circle class="npc-range-combat" cx="${q[0]}" cy="${q[1]}" r="18"/><circle class="npc-range-talk" cx="${q[0]}" cy="${q[1]}" r="8"/>`;})():'';
 const svgMarkup=zoneMapRenderer.renderSvg({viewBox:view,preserveAspectRatio:(document.fullscreenElement===$('zoneMapFrame')||$('zoneMapFrame')?.classList.contains('map-fullscreen-fallback'))?'xMidYMid slice':'xMidYMid meet',ariaLabel:zoneMapMode==='zone'?'Карта Зоны':'Карта '+(here()?.name||'локации'),regions,sectorRoutes:edges,selectedNpcRoute:npcRoutes,movementRoute:moveRoute,rangeOverlay,npcMarkers:npcOverlays,dynamicMarkers:dynamicOverlays+meDot,markers:overlays});
 const mapHost=$('zoneMap');zoneMapRenderer.patchSvg(mapHost,svgMarkup);
 if(mapHost&&!mapHost.querySelector('#mapEntityCard')){const card=document.createElement('div');card.id='mapEntityCard';card.className='map-entity-card';card.hidden=true;mapHost.appendChild(card);}
 let rangeLegend=mapHost?.querySelector('.map-range-legend');
 if(mapRadiusTarget&&!rangeLegend&&mapHost){rangeLegend=document.createElement('div');rangeLegend.className='map-range-legend';mapHost.appendChild(rangeLegend);}
 if(mapRadiusTarget&&rangeLegend)rangeLegend.innerHTML='<span>8 м · разговор</span><span>18 м · бой</span><button type="button" onclick="mapRadiusTarget=null;renderZoneMap()">Скрыть радиус</button>';
 else if(rangeLegend)rangeLegend.remove();
 refreshNpcMarkerIndex();$('mapCoordinates').textContent=`${zoneMapMode==='zone'?'ВСЯ ЗОНА':'ЛОКАЦИЯ: '+(here()?.name||'—')} · ${Math.round(zoneMapZoom*100)}% · X ${Math.round(me.x)} / Y ${Math.round(me.y)}`;zoneMapHasRendered=true;zoneMapDirty=false;
}
let npcMarkerElements=new Map(),mutantMarkerElements=new Map();
let pendingKeyPointApproach=null,preservePendingKeyPointApproach=false;
function refreshNpcMarkerIndex(){
 npcMarkerElements=new Map();mutantMarkerElements=new Map();for(const marker of document.querySelectorAll('#zoneMapSvg [data-npc-id]')){const id=marker.getAttribute('data-npc-id');if(id&&!npcMarkerElements.has(id))npcMarkerElements.set(id,marker);}for(const marker of document.querySelectorAll('#zoneMapSvg [data-mutant-id]')){const id=marker.getAttribute('data-mutant-id');if(id)mutantMarkerElements.set(id,marker);}
}
function animateNpcMotion(payload){
 const localIndex=new Map((g.npcs||[]).map(n=>[String(n.id),n])),transforms=[];
 for(const item of payload?.npcs||[]){
  const npc=serverWorld?.npcState?.[item.id];if(!npc)continue;
  const to={x:Number(item.x),y:Number(item.y)};if(!Number.isFinite(to.x)||!Number.isFinite(to.y))continue;
  npc.location=item.location||npc.location;npc.travelTo=item.travelTo||null;npc.action=item.action||npc.action;npc.behavior=item.behavior||npc.behavior;npc.x=to.x;npc.y=to.y;
  const localNpc=localIndex.get(String(item.id));if(localNpc){localNpc.location=npc.location;localNpc.loc=npc.location;localNpc.x=to.x;localNpc.y=to.y;localNpc.travelTo=npc.travelTo;}
  const marker=npcMarkerElements.get(String(item.id));if(marker){const scale=marker.classList.contains('world-squad-marker')?'.48':'.42';transforms.push({id:item.id,transform:`translate(${to.x} ${to.y}) scale(${scale})`});}
 }
 // Multiple socket updates in one frame collapse to the latest transform per NPC.
 zoneMapMotion.schedule(transforms,id=>npcMarkerElements.get(id));
}
function npcRoutePoints(n){
 const current=n.location||n.loc||g.loc,target=n.missionOrder?.target||n.destination;
 let sectors=Array.isArray(n.route)?n.route.filter(x=>typeof x==='string'&&zoneSectorCoords[x]):[];
 if(sectors.length<2&&target&&target!==current){const queue=[[current]],seen=new Set([current]);while(queue.length){const path=queue.shift(),last=path[path.length-1];if(last===target){sectors=path;break;}for(const [a,b] of zoneLinks){const next=a===last?b:b===last?a:null;if(next&&!seen.has(next)){seen.add(next);queue.push([...path,next]);}}}}
 return sectors.length>1?sectors.map(id=>zoneSectorCoords[id]).filter(Boolean):[];
}
function issueApproachOrder(target,kind,id){if(!target||!Number.isFinite(Number(target.x))||!Number.isFinite(Number(target.y)))return;const npc=kind==='npc'?npcBy(id):null;if(kind==='npc'&&(!npc||(npc.loc||npc.location)!==g.loc))return alert('Сталкер находится в другом секторе.');if(npc&&npcDistance(npc)<=8){startTalk(npc.id);return;}const me=playerWorldPosition(),dx=me.x-Number(target.x),dy=me.y-Number(target.y),d=Math.hypot(dx,dy)||1,stop=5,point={x:Math.max(8,Math.min(992,Number(target.x)+dx/d*stop)),y:Math.max(8,Math.min(1992,Number(target.y)+dy/d*stop))};if(!confirm(`Подойти к выбранной цели${npc?' «'+(npc.name||'сталкер')+'»':''}?`))return;playerMoveTarget=point;walkTarget=point;pendingSectorExit=null;zoneMapMode='local';zoneMapCenter={x:Number(target.x),y:Number(target.y)};zoneMapDirty=true;renderZoneMap();if(zoneSocket?.connected){zoneSocket.emit('player:move-order',{x:point.x,y:point.y,location:g.loc});updateMoveOrderStatus(kind==='stash'?'Подхожу к тайнику…':kind==='artifact'?'Подхожу к сигналу артефакта…':'Подхожу к сталкеру для разговора…');}else{startWalking();updateMoveOrderStatus(kind==='stash'?'Иду к тайнику…':kind==='artifact'?'Иду к сигналу артефакта…':'Иду к сталкеру для разговора…');}}
function selectMapNpc(id){
 // Selecting a marker is informational only. Movement starts exclusively from the explicit action button.
 const n=npcBy(id);if(!n)return;
 showMapNpc(id);
}
function approachNpcForConversation(id){
 const n=npcBy(id);if(!n)return;
 if((n.loc||n.location)!==g.loc)return alert('Сталкер находится в другом секторе. Сначала доберись до его локации.');
 const p=npcMapPosition(n);
 if(npcDistance(n)<=8){startTalk(n.id);return;}
 issueApproachOrder({x:p[0],y:p[1]},'npc',n.id);
 updateMoveOrderStatus(`Подход к ${n.name||'сталкеру'} подтверждён. После приближения можно будет поговорить.`);
}
function approachKeyPoint(id){
 const point=serverWorld?.keyPoints?.[id];if(!point)return;
 if(point.location!==g.loc){pendingKeyPointApproach={id:point.id,location:point.location};travel(point.location,true);return;}
 const q=keyPointMapPosition(point);issueApproachOrder({x:q[0],y:q[1]},'keypoint',point.id);
 updateMoveOrderStatus(`Направляешься к объекту «${point.name}»…`);
}
function showMapKeyPoint(id){
 const point=serverWorld?.keyPoints?.[id],card=$('mapEntityCard');if(!point||!card)return;
 const active=(serverWorld?.warOperations||[]).some(op=>op.pointId===point.id&&op.status==='active');
 const q=keyPointMapPosition(point),sameSector=point.location===g.loc,d=sameSector?Math.hypot(playerWorldPosition().x-q[0],playerWorldPosition().y-q[1]):null;
 const approach=sameSector?(d<=9?'<span class="small muted">Ты уже рядом с объектом.</span>':`<button type="button" onclick="approachKeyPoint('${escapeHtml(point.id)}')">Подойти к объекту</button>`):`<button type="button" onclick="approachKeyPoint('${escapeHtml(point.id)}')">Отправиться к объекту · ${escapeHtml(locationName(point.location))}</button>`;
 const action=sameSector&&point.owner!==g.faction&&!active?`<button type="button" onclick="warCreate('${escapeHtml(point.id)}')">Начать операцию · 350 ₽</button>`:'';
 const garrison=Math.max(0,Number(point.garrisonState?.troops??point.garrison)||0),fort=Math.max(0,Number(point.garrisonState?.fortification)||0),supply=point.supplyStatus==='cut'?'снабжение нарушено':point.supplyStatus==='strained'?'снабжение ограничено':'снабжение в норме';
 const pact=(serverWorld?.factionPacts||[]).find(p=>p.status==='active'&&p.expiresAt>Date.now()&&(p.a===g.faction&&p.b===point.owner||p.b===g.faction&&p.a===point.owner));
 card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>КЛЮЧЕВОЙ ОБЪЕКТ</b><button type="button" onclick="closeMapEntityCard()">×</button></div><div class="map-entity-meta">${escapeHtml(point.name)} · ${escapeHtml(locationName(point.location))}${sameSector?` · ${Math.round(d)} м от тебя`:''}</div><p class="small muted">Владелец: ${escapeHtml(point.owner)} · контроль: ${Math.round(Number(point.control)||0)}%${Number(point.captureProgress)>0?` · давление: ${Math.round(point.captureProgress)}%`:''}</p><p class="small muted">Гарнизон: ${garrison} · укрепления: ${fort}/5 · ${supply}${pact?` · ${pact.type==='alliance'?'военный союз':'перемирие'}`:''}</p><div class="map-player-actions">${approach}${action}</div>`;
}
function showMapStash(id){const st=(currentStashes||[]).find(x=>x.id===id&&x.discovered&&!x.looted),card=$('mapEntityCard');if(!st||!card)return;const d=Math.hypot(playerWorldPosition().x-Number(st.x),playerWorldPosition().y-Number(st.y));card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>ТАЙНИК · ${escapeHtml(locationName(st.location))}</b><button type="button" onclick="closeMapEntityCard()">×</button></div><div class="map-entity-meta">${Math.round(d)} м от тебя · ${d<=18?'Можно обыскать':'Нужно подойти ближе (18 м)'}</div><p class="small muted">${escapeHtml(st.note||'Спрятанные припасы')}</p><div class="map-player-actions">${d<=18?`<button type="button" onclick="lootFieldStash('${escMapAttr(st.id)}')">Обыскать тайник</button>`:`<button type="button" onclick="approachStash('${escMapAttr(st.id)}')">Подойти к тайнику</button>`}</div>`;mapRadiusTarget=null;zoneMapCenter={x:Number(st.x),y:Number(st.y)};zoneMapDirty=true;renderZoneMap();}
function approachStash(id){const st=(currentStashes||[]).find(x=>x.id===id&&x.discovered&&!x.looted);if(!st)return;issueApproachOrder({x:Number(st.x),y:Number(st.y)},'stash',id);showMapStash(id);}
function showMapBattle(id){
 const engagement=(serverWorld?.battlefronts||[]).find(x=>String(x.id)===String(id)),card=$('mapEntityCard');if(!engagement||!card)return;const battle=engagement;
 const ids=Array.isArray(battle.participants)?battle.participants:[];
 const roster=ids.map(entry=>{const pid=typeof entry==='string'?entry:entry?.id;const live=(serverWorld?.npcState||{})[pid]||npcBy(pid)||{};const snapshot=(engagement.participantSnapshots||[]).find(x=>x.id===pid)||{};return {...snapshot,...live,id:pid||snapshot.id};}).filter(n=>n.id);
 const hp=n=>Math.max(0,Math.min(100,Math.round(Number(n.health??n.hp??100))));
 const renderSide=(faction)=>{const members=roster.filter(n=>(n.faction||'Неизвестно')===faction);return members.length?members.map(n=>{const value=hp(n),dead=n.alive===false||value<=0;return `<div class="map-battle-member"><span><b>${escapeHtml(n.name||'Сталкер')}</b><small>${escapeHtml(n.role||'Боец')} · ${escapeHtml(n.behavior||n.action||'в секторе')} · ${dead?'погиб': 'в строю'}</small></span><span class="map-battle-health"><b>${value}%</b><i><em style="width:${value}%"></em></i></span></div>`;}).join(''):'<div class="small muted">Нет подтверждённых участников.</div>';};
 const sides=[...new Set(roster.map(n=>n.faction||'Неизвестно'))];const attack=engagement.attacker||sides[0]||'Сторона А',defend=engagement.defender||sides.find(x=>x!==attack)||'Сторона Б';
 card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>⚔ ТАКТИЧЕСКИЙ ОТЧЁТ · БОЕВОЕ СТОЛКНОВЕНИЕ</b><button type="button" onclick="closeMapEntityCard()" aria-label="Закрыть">×</button></div>
 <div class="map-entity-meta">${escapeHtml(locationName(engagement.location))} · ${escapeHtml(attack)} против ${escapeHtml(defend)}</div>
 <div class="map-entity-meta">Раундов: ${Number(engagement.rounds)||0} · Потери: ${Number(engagement.losses)||0} · Статус: ${engagement.status==='active'?'идёт бой':'завершено'}${engagement.winner?` · победитель: ${escapeHtml(engagement.winner)}`:''}</div>
 <h4>${escapeHtml(attack)} · участники</h4><div class="map-battle-roster">${renderSide(attack)}</div>
 <h4>${escapeHtml(defend)} · участники</h4><div class="map-battle-roster">${renderSide(defend)}</div>
 <div class="map-entity-meta">Показаны имена, группировки, роли, состояние и текущий процент здоровья из последнего обновления мира.</div>
 <div class="map-player-actions"><button type="button" onclick="showMapSectorCard('${String(engagement.location).replace(/[^a-z0-9_-]/gi,'')}')">Сведения о секторе</button><button type="button" onclick="zoneMapMode='zone';zoneMapCenter=null;renderZoneMap()">Обзор всей Зоны</button></div>`;
}

function showMapNpc(id){
 const n=npcBy(id);if(!n)return;
 mapRadiusTarget=id;zoneMapMode=(n.loc||n.location)===g.loc?'local':'zone';const p=npcMapPosition(n);zoneMapCenter={x:p[0],y:p[1]};zoneMapDirty=true;renderZoneMap();
 const card=$('mapEntityCard');if(!card)return;
 const route=npcRoutePoints(n),destination=n.missionOrder?.target||n.destination||(n.action==='travel'?n.route?.at(-1):null),status=({campfire:'У костра',guard:'На посту',patrol:'Патрулирует',travel:'В пути',assault:'Выдвигается',mission:'Выполняет приказ',combat:'В бою',retreat:'Отступает',rest:'Отдыхает',await_rescue:'Ждёт эвакуации',rescue_escort:'Эвакуируется'})[n.behavior||n.action]||'В секторе';
 const routeNames=Array.isArray(n.route)?n.route.map(locationName):route.map(x=>{const id=Object.keys(zoneSectorCoords).find(k=>zoneSectorCoords[k]===x);return locationName(id)});
 card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>СТАЛКЕР · ${escapeHtml(n.name||'Безымянный')}</b><button type="button" onclick="closeMapEntityCard()" aria-label="Закрыть">×</button></div><div class="map-entity-meta">${escapeHtml(n.role||'сталкер')} · ${escapeHtml(n.faction||'Неизвестная группировка')} · ${escapeHtml(locationName(n.location||n.loc))}</div><div class="map-entity-meta">Состояние: ${escapeHtml(status)} · Здоровье: ${Math.round(Number(n.health??100))}%</div><div class="map-entity-hint">Выбор отметки не перемещает персонажа. Чтобы начать движение, нажми «Подойти для разговора».</div>${destination?`<div class="map-entity-meta">Направляется: ${escapeHtml(locationName(destination))}</div>`:''}${route.length>1?`<div class="map-entity-meta">Маршрут: ${routeNames.map(escapeHtml).join(' → ')}</div>`:'<div class="map-entity-meta">Активного маршрута нет — сталкер находится на месте или патрулирует сектор.</div>'}<div class="map-player-actions">${(n.loc||n.location)===g.loc?(npcDistance(n)<=8?`<button type="button" onclick="startTalk('${escMapAttr(n.id)}')">Поговорить</button>`:`<button type="button" onclick="approachNpcForConversation('${escMapAttr(n.id)}')">Подойти для разговора · ${Math.round(npcDistance(n))} м</button>`):'<span class="small muted">Для разговора нужно находиться в одном секторе</span>'}${npcMarkerClass(n)==='marker-enemy'&&(n.loc||n.location)===g.loc?`<button type="button" onclick="startNpcEncounter('${escMapAttr(n.id)}')">Вступить в бой</button>`:''}<button type="button" onclick="showMapNpcRadius('${escMapAttr(n.id)}')">Показать на карте</button></div>`;
}
function showMapSquad(squadId){
 const source=serverWorld?.npcState?Object.values(serverWorld.npcState):(g.npcs||[]);
 const members=source.filter(n=>n.alive!==false&&(n.squadId||n.id)===squadId);
 if(!members.length)return;
 const lead=members[0],card=$('mapEntityCard');if(!card)return;
 const faction=lead.faction||'Неизвестная группировка',loc=lead.location||lead.loc||g.loc;
 card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>ОТРЯД · ${members.length} ${members.length===1?'СТАЛКЕР':members.length<5?'СТАЛКЕРА':'СТАЛКЕРОВ'}</b><button type="button" onclick="closeMapEntityCard()" aria-label="Закрыть">×</button></div><div class="map-entity-meta">${escapeHtml(lead.squadName||'Полевой отряд')} · ${escapeHtml(faction)} · ${escapeHtml(locationName(loc))}</div><div class="map-entity-members">${members.map(n=>`<button type="button" class="map-entity-member" onclick="showMapNpc('${escMapAttr(n.id)}')"><span class="map-entity-dot ${npcMarkerClass(n)}"></span><span><b>${escapeHtml(n.name||'Безымянный сталкер')}</b><small>${escapeHtml(n.role||'сталкер')} · ${escapeHtml(n.action||n.behavior||'в секторе')}</small></span><em>${Math.round(Number(n.health??100))}% · Выбрать</em></button>`).join('')}</div>`;
}
function escMapAttr(value){return String(value??'').replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function showMapMutants(packId){
 const pack=(ecologyData().mutantPacks||[]).find(p=>p.id===packId),card=$('mapEntityCard');if(!pack||!card)return;
 card.hidden=false;card.innerHTML=`<div class="map-entity-head"><b>ОБНАРУЖЕНЫ МУТАНТЫ</b><button type="button" onclick="closeMapEntityCard()" aria-label="Закрыть">×</button></div><div class="map-entity-meta">${escapeHtml(pack.species)} · ${escapeHtml(locationName(pack.location))}</div><div class="map-mutant-count"><strong>${Math.max(0,Number(pack.count)||0)}</strong><span>особей в группе</span></div><div class="map-entity-meta">Агрессия: ${Math.round(Number(pack.aggression)||0)}% · Состояние: ${Math.round(Number(pack.health)||100)}%</div><p class="small muted">Держись осторожно: группа отмечена как потенциально опасная.</p>`;
}
function closeMapEntityCard(){const card=$('mapEntityCard');if(card){card.hidden=true;card.innerHTML='';}}
function updatePlayerMapMarker(){
 const p=playerWorldPosition(),marker=$('playerMapMarker'),svg=$('zoneMapSvg');
 if(marker)marker.setAttribute('transform',`translate(${p.x} ${p.y})`);
 if(svg&&!zoneMapCenter){const v=currentMapView();svg.setAttribute('viewBox',`${v.x} ${v.y} ${v.w} ${v.h}`);}
 const coords=$('mapCoordinates');if(coords)coords.textContent=`${zoneMapMode==='zone'?'ВСЯ ЗОНА':'ЛОКАЦИЯ: '+(here()?.name||'—')} · ${Math.round(zoneMapZoom*100)}% · X ${Math.round(p.x)} / Y ${Math.round(p.y)}`;
}
function mapPointer(ev){if(zoneMapSuppressClick||ev.target?.closest?.('.world-marker,.map-sector,.map-region'))return;const svg=$('zoneMapSvg');if(!svg)return;const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse()),decision=zoneMapInteraction.resolveMapClick({x:p.x,y:p.y,mode:zoneMapMode,currentLocation:g.loc,playerPosition:playerWorldPosition(),localOffset:245,deadZone:5});if(decision.type==='sector'){handleMapSectorSelect(decision.sectorId);return;}if(decision.type!=='move')return;const target=decision.target;if(!confirm('Отправиться к выбранной точке на карте?'))return;pendingSectorExit=null;playerMoveTarget=target;walkTarget=target;zoneMapCenter=null;zoneMapDirty=true;renderZoneMap();if(zoneSocket?.connected){zoneSocket.emit('player:move-order',{x:target.x,y:target.y,location:g.loc});updateMoveOrderStatus('Приказ отправлен серверу…');}else{startWalking();updateMoveOrderStatus('Локальный режим: движение без синхронизации сервера');}}
function startExpedition(){if(pendingKeyPointApproach&&!preservePendingKeyPointApproach)pendingKeyPointApproach=null;preservePendingKeyPointApproach=false;const destination=$('expeditionDestination')?.value,mode=$('expeditionMode')?.value||'safe',plan=zoneMapInteraction.planExpedition({from:g.loc,to:destination,mode,stamina:Number(g.stamina)||0,squadActive:!!activePlayerSquad,isSquadLeader:!activePlayerSquad||activePlayerSquad.leader===zonePlayerId});if(!plan.ok){if(plan.reason==='missing-destination')return updateMoveOrderStatus('Выбери пункт назначения');if(plan.reason==='already-there')return updateMoveOrderStatus('Ты уже находишься в этом секторе');if(plan.reason==='not-squad-leader')return alert('Маршрутом отряда управляет командир.');if(plan.reason==='no-route')return alert('Маршрут между этими секторами не найден. Нельзя перескочить через отсутствующие переходы.');if(plan.reason==='insufficient-stamina')return alert('Недостаточно выносливости для такого перехода.');return;}const path=plan.path,routeNames=path.map(locationName).join(' → ');if(!confirm(`Проложен маршрут:
${routeNames}

Промежуточные сектора придётся пройти по порядку. Идём туда?`))return;if(zoneSocket?.connected){zoneSocket.emit('player:expedition-order',{destination,mode});updateMoveOrderStatus('КПК рассчитывает маршрут…');return;}const now=Date.now();/* nextHopAt=Date.now()+25000 keeps the local hop timer aligned with the route animation. */g.expedition={from:g.loc,to:destination,path,index:0,status:'travelling',mode,startedAt:now,nextHopAt:now+25000};save();startExpeditionVisual();updateMoveOrderStatus(`В пути: ${locationName(g.loc)} → ${locationName(path[1])}. Следующий переход примерно через 25 секунд.`);if(!localExpeditionTimer)localExpeditionTimer=setInterval(advanceLocalExpedition,1000);renderMap();renderZoneMap();}
let localExpeditionTimer=null,expeditionVisualTimer=null;
function startExpeditionVisual(){if(expeditionVisualTimer)return;expeditionVisualTimer=setInterval(()=>{if(g.expedition?.status!=='travelling'){clearInterval(expeditionVisualTimer);expeditionVisualTimer=null;return;}if($('world')?.classList.contains('active'))updatePlayerMapMarker();},100);}
function recordSectorArrival(previousLocation,destination){
 if(!destination||destination===previousLocation)return false;
 g.careerStats ||= {};
 g.careerStats.travelled=(Number(g.careerStats.travelled)||0)+1;
 g.visitedLocations=[...new Set([...(g.visitedLocations||[]),previousLocation,destination].filter(Boolean))];
 return true;
}
function advanceLocalExpedition(){const e=g.expedition;if(!e||e.status!=='travelling'){clearInterval(localExpeditionTimer);localExpeditionTimer=null;return;}if(Date.now()<e.nextHopAt)return;const previousLocation=g.loc,next=e.path[++e.index],l=g.locations.find(x=>x.id===next);if(!l){g.expedition=null;save();return;}consumeExpeditionSupplies(Math.min(100,25+(l.travel||1)*8));g.loc=next;recordSectorArrival(previousLocation,next);g.worldPosition={x:sectorCenter(next)[0],y:sectorCenter(next)[1]+24};activeNpc=null;log(`Экспедиция: ты прибыл в сектор «${l.name}».`);news('Сталкер в пути',`${g.name} достиг района «${l.name}».`);const arrived=e.index>=e.path.length-1;if(arrived){g.expedition=null;updateMoveOrderStatus(`Ты прибыл в пункт назначения: ${l.name}.`);clearInterval(localExpeditionTimer);localExpeditionTimer=null;if(expeditionVisualTimer){clearInterval(expeditionVisualTimer);expeditionVisualTimer=null;}if(pendingKeyPointApproach&&pendingKeyPointApproach.location===g.loc){const targetId=pendingKeyPointApproach.id;pendingKeyPointApproach=null;setTimeout(()=>approachKeyPoint(targetId),120);}else setTimeout(()=>startRandomEncounter(false),120);}else{e.startedAt=Date.now();e.nextHopAt=e.startedAt+25000;g.worldPosition={x:sectorCenter(next)[0],y:sectorCenter(next)[1]+24};updateMoveOrderStatus(`Промежуточный сектор: ${l.name}. Следующий переход через 25 секунд.`);}save();render();renderZoneMap();view('world');} 
function cancelMoveOrder(){const cancellingExpedition=!!g.expedition;if(cancellingExpedition){pendingKeyPointApproach=null;preservePendingKeyPointApproach=false;g.expedition=null;if(localExpeditionTimer){clearInterval(localExpeditionTimer);localExpeditionTimer=null;}if(expeditionVisualTimer){clearInterval(expeditionVisualTimer);expeditionVisualTimer=null;}save();}if(zoneSocket?.connected)zoneSocket.emit(cancellingExpedition?'player:expedition-cancel':'player:move-cancel');if(walkTimer){clearInterval(walkTimer);walkTimer=null;}walkTarget=null;playerMoveTarget=null;playerMoving=false;pendingSectorExit=null;updateMoveOrderStatus('Нет активного маршрута');renderZoneMap()}
function updateMoveOrderStatus(text){const el=$('mapOrderStatus');if(el){const b=el.querySelector('b');if(b)b.textContent=text||'Маршрут активен';}}
function blockedAt(x,y){const r=5;return x<r||y<r||x>1000-r||y>2000-r;}
function syncWalkPosition(){const p=playerWorldPosition(),now=performance.now();if(now-lastPositionSync>1000){lastPositionSync=now;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);}}
function startWalking(){if(walkTimer||zoneSocket?.connected)return;let last=performance.now();walkTimer=setInterval(()=>{const now=performance.now(),dt=Math.min(.08,(now-last)/1000);last=now;const p=playerWorldPosition();if(!walkTarget){clearInterval(walkTimer);walkTimer=null;playerMoving=false;return;}let dx=walkTarget.x-p.x,dy=walkTarget.y-p.y,d=Math.hypot(dx,dy);if(d<3){walkTarget=null;playerMoveTarget=null;playerMoving=false;clearInterval(walkTimer);walkTimer=null;updateMoveOrderStatus('Ты достиг отмеченной точки');renderZoneMap();return;}dx/=d;dy/=d;const step=2.5*dt,nx=p.x+dx*step,ny=p.y+dy*step;if(!blockedAt(nx,p.y))p.x=nx;if(!blockedAt(p.x,ny))p.y=ny;g.worldPosition=p;playerMoving=true;syncWalkPosition();updatePlayerMapMarker()},100)}

const achievementDefs=[
 ["first_contact","Первый контакт","Поговорить с первым NPC","☻",()=>g.meetings>=1],
 ["wanderer","Бродяга","Посетить пять разных локаций","⌖",()=>new Set(g.log.filter(x=>x.startsWith("Переход:"))).size>=4],
 ["collector","Собиратель","Найти первый артефакт","✧",()=>!!g.flags.foundArtifact],
 ["trusted","Своего не бросаем","Достичь 25 репутации","⚑",()=>g.rep>=25],
 ["veteran","Сталкер со стажем","Выполнить три задания","★",()=>g.completed>=3],
 ["diplomat","Переговорщик","Улучшить отношения с любой группировкой","⇄",()=>Object.values(g.diplomacy||{}).some(o=>Object.values(o).some(v=>v>=20))],
 ["rich","Капитал Зоны","Накопить 5000 рублей","₽",()=>g.money>=5000],
 ["talkative","Свой человек","Провести десять встреч с NPC","▣",()=>g.meetings>=10],
 ["explorer","Картограф","Открыть все сектора карты","▦",()=>g.locations.length>=15&&g.locations.every(l=>g.log.some(x=>x.includes("Переход: "+l.name))||l.id==="cordon")]
];
function checkAchievements(){for(const [id,name,desc,icon,fn] of achievementDefs){if(!g.achievements[id]&&fn()){g.achievements[id]=true;log("Получено достижение: "+name);news("Достижение разблокировано",name+" — "+desc)}}}
function renderAchievements(){checkAchievements();let done=achievementDefs.filter(a=>g.achievements[a[0]]).length;$("achievementStats").innerHTML=`<div class="stat"><span>Открыто</span><strong>${done}/${achievementDefs.length}</strong></div><div class="stat"><span>Завершено заданий</span><strong>${g.completed}</strong></div><div class="stat"><span>Встречи</span><strong>${g.meetings}</strong></div>`;$("achievementList").innerHTML=achievementDefs.map(([id,n,d,ic])=>`<div class="achievement ${g.achievements[id]?'':'locked'}"><div class="medal">${ic}</div><div><b>${n}</b><div class="desc">${d}</div><small>${g.achievements[id]?'ПОЛУЧЕНО':'ЕЩЁ НЕ ПОЛУЧЕНО'}</small></div></div>`).join("")}
function adjustDiplomacy(name,action){let player=g.faction;if(name===player)return;let rel=g.diplomacy[player]?.[name]??0;let cost=action==="treaty"?250:action==="intel"?80:120;if(g.money<cost)return alert("Недостаточно рублей для дипломатической миссии.");g.money-=cost;let delta=action==="treaty"?12:action==="intel"?7:4;g.diplomacy[player][name]=Math.min(60,rel+delta);if(g.diplomacy[name])g.diplomacy[name][player]=Math.min(60,(g.diplomacy[name][player]||0)+Math.floor(delta/2));g.rep+=1;let msg=action==="treaty"?"предложил торговое соглашение":action==="intel"?"обменялся разведданными":"направил дипломатического посредника";log("Ты "+msg+" группировке «"+name+"».");news("Дипломатия",g.faction+" улучшили отношения с группировкой «"+name+"».");save()}
function renderDiplomacy(){const summary=$("diplomacySummary"),list=$("diplomacyList"),relations=$("relations");let friendly=g.factions.filter(f=>f.name!==g.faction&&factionRelationValue(g.faction,f.name)>=20).length;if(summary)summary.innerHTML=`<div class="stat"><span>Твоя группировка</span><strong style="font-size:15px">${escapeHtml(g.faction)}</strong></div><div class="stat"><span>Дружественные каналы</span><strong>${friendly}</strong></div><div class="stat"><span>Казна</span><strong>${Number(g.money||0).toLocaleString('ru-RU')} ₽</strong></div>`;const rows=g.factions.filter(f=>f.name!==g.faction);if(relations)relations.innerHTML=rows.map(f=>{let r=factionRelationValue(g.faction,f.name);let label=r>=35?"Союзные контакты":r>=15?"Дружелюбные":r>=-14?"Нейтралитет":r>=-34?"Напряжённость":"Враждебность";return `<div class="item"><span>${factionIconMarkup(f.name)} ${escapeHtml(f.name)} <small class="muted">· ${label}</small></span><b class="${r<0?'red':'gold'}">${r>0?'+':''}${r}</b></div>`}).join("");if(list)list.innerHTML=rows.map(f=>{let r=factionRelationValue(g.faction,f.name);let locked=g.faction==='Монолит'||f.name==='Монолит'||r<=-55;let label=r>=35?"Союзные контакты":r>=15?"Дружелюбные":r>=-14?"Нейтралитет":r>=-34?"Напряжённость":"Враждебность";return `<div class="item block"><div class="row" style="align-items:center"><div style="display:flex;gap:9px;align-items:center"><span class="faction-emblem">${factionIconMarkup(f.name)}</span><div><b>${escapeHtml(f.name)}</b><div class="desc">${label} · отношение ${r>0?'+':''}${r}</div></div></div><span class="tag">${Number(f.members||0).toLocaleString('ru-RU')} бойцов</span></div><div class="bar"><i style="width:${Math.max(0,Math.min(100,(r+60)/1.2))}%"></i></div>${locked?'<div class="desc">Дипломатический канал закрыт: устойчивая вражда.</div>':`<div class="rightbuttons" style="margin-top:9px"><button onclick="adjustDiplomacy('${f.name}','mediator')">Посредник · 120 ₽</button><button onclick="adjustDiplomacy('${f.name}','intel')">Обмен данными · 80 ₽</button><button onclick="adjustDiplomacy('${f.name}','treaty')">Торговый пакт · 250 ₽</button></div>`}</div>`}).join("")}
function setOverviewRival(name){overviewRival=name;renderOverviewFactionFront()}
function renderOverviewFactionFront(){const rows=factionRankRows(),own=rows.find(x=>x.name===g.faction);if(!own)return;const options=rows.filter(x=>x.name!==g.faction);if(!options.some(x=>x.name===overviewRival))overviewRival=options.find(x=>factionRelationValue(g.faction,x.name)<0)?.name||options[0]?.name||'';const rival=rows.find(x=>x.name===overviewRival)||options[0];const sel=$('overviewRival');if(sel){sel.innerHTML=options.map(x=>`<option value="${escapeHtml(x.name)}" ${x.name===overviewRival?'selected':''}>${escapeHtml(x.name)}</option>`).join('');}if(!rival)return;const put=(id,value)=>{const el=$(id);if(el)el.textContent=value};const bar=(id,value,max)=>{const el=$(id);if(el)el.style.width=Math.max(3,Math.min(100,max?value/max*100:0))+'%'};const relation=factionRelationValue(own.name,rival.name),relText=relation<=-35?'ОТКРЫТАЯ ВРАЖДА':relation<0?'НАПРЯЖЁННЫЕ ОТНОШЕНИЯ':relation>=25?'СОТРУДНИЧЕСТВО':'НЕЙТРАЛЬНЫЕ ОТНОШЕНИЯ';put('overviewOwnEmblem','');const ownEm=$('overviewOwnEmblem'),rivalEm=$('overviewRivalEmblem');if(ownEm)ownEm.innerHTML=factionEmblemMarkup(own);if(rivalEm)rivalEm.innerHTML=factionEmblemMarkup(rival);put('overviewOwnName',own.name);put('overviewRivalName',rival.name);put('overviewFrontGoal',relation<=-35?'Сдерживать враждебную группировку':relation<0?'Следить за напряжённостью на границе':'Укреплять позиции и влияние');put('overviewFrontTask',`Текущий сектор: ${here().name} · контроль: ${here().owner||'не установлен'}`);put('overviewFrontRelation',`${relText} · ${relation>0?'+':''}${relation}`);put('overviewOwnSquads',`${own.patrols} бойцов в патрулях`);put('overviewRivalSquads',`${rival.patrols} бойцов в патрулях`);put('overviewOwnResources',`${own.territoryCount} террит. · влияние ${own.influence}%`);put('overviewRivalResources',`${rival.territoryCount} террит. · влияние ${rival.influence}%`);const max=Math.max(own.score,rival.score,1);bar('overviewOwnStrengthBar',own.score,max);bar('overviewRivalStrengthBar',rival.score,max);const maxP=Math.max(own.patrols,rival.patrols,1),maxT=Math.max(own.territoryCount,rival.territoryCount,1);bar('overviewOwnSquadsBar',own.patrols,maxP);bar('overviewRivalSquadsBar',rival.patrols,maxP);bar('overviewOwnResourcesBar',own.territoryCount,maxT);bar('overviewRivalResourcesBar',rival.territoryCount,maxT)}

let factionRadioMessages=[];
function renderFactionRadio(){const feed=$('factionRadioFeed'),name=$('radioFactionName');if(name)name.textContent=`ПРИЁМ ЭФИРА · ${g.faction||'ГРУППИРОВКА'}`;if(!feed)return;feed.innerHTML=factionRadioMessages.length?factionRadioMessages.slice(-100).reverse().map(m=>`<article class="radio-message radio-${escapeHtml(m.kind||'report')}"><div><b>${escapeHtml(m.name||'Радист')}</b><small>${escapeHtml(m.title||'Сообщение группировки')} · ${escapeHtml(locationName(m.location||''))} · ${new Date(Number(m.at)||Date.now()).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</small></div><p>${escapeHtml(m.text||'')}</p></article>`).join(''):'<div class="mutedbox small">В эфире пока тихо. Ожидай передач от сталкеров своей группировки.</div>';}
function renderNews(){const host=$("newsList");if(!host)return;host.innerHTML=g.news.map(n=>`<div class="item block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${escapeHtml(n.title)}</b><span class="pill">День ${Number(n.day)||1} · ${escapeHtml(n.hour||"--:--")}</span></div><div class="desc">${escapeHtml(n.body)}</div></div>`).join("")}
function generateRumor(){let arr=["На Кордоне говорят, что торговцы скоро обновят ассортимент.","На Свалке замечены незнакомые сталкеры. Их цели пока неизвестны.","Учёные на Янтаре ищут добровольцев для новых наблюдений.","В баре обсуждают перемены в отношениях между группировками.","Проводник утверждает, что на старой тропе появились новые ориентиры."];let r=arr[Math.floor(Math.random()*arr.length)];news("Слух от сталкеров",r);log("Получен новый слух через КПК.");save()}
function clearOldNews(){g.news=g.news.slice(0,5);save()}
function renderCraft(){$("recipes").innerHTML=[{name:"Полевой набор",desc:"Обменять 2 металлолома на 1 бинт.",cost:{scrap:2},out:"bandage"},{name:"Запас болтов",desc:"Обменять 1 металлолом на 5 болтов.",cost:{scrap:1},out:"bolt"},{name:"Аптечный комплект",desc:"Обменять 3 металлолома на аптечку.",cost:{scrap:3},out:"med"}].map((r,i)=>`<div class="item"><div><b>${r.name}</b><div class="desc">${r.desc}</div></div><button onclick="craft(${i})">Собрать</button></div>`).join("")}
function craft(i){let recipes=[{cost:2,out:"bandage",name:"Бинт"},{cost:1,out:"bolt",name:"Болты",qty:5},{cost:3,out:"med",name:"Аптечка"}],r=recipes[i];if(count("scrap")<r.cost)return alert("Недостаточно металлолома.");take("scrap",r.cost);let map={bandage:["Бинт","Медицина","Полевой расходный предмет",.2,45],bolt:["Болты","Инструмент","Металлические болты",.1,5],med:["Аптечка","Медицина","Восстанавливает здоровье",.4,100]}[r.out];addItem(r.out,map[0],map[1],map[2],map[3],map[4],r.qty||1);log("Изготовлено: "+r.name+".");save()}
function renderProfile(){
 const rank=g.xp<50?"Новичок":g.xp<150?"Опытный сталкер":g.xp<300?"Следопыт":g.xp<600?"Ветеран Зоны":"Легенда Зоны";
 $("profileName").textContent=[g.realName,g.name].filter(Boolean).join(" ");$("rank").textContent=rank;$("profileFaction").textContent=`${g.faction} · ${here().name}`;$("profileBio").textContent=`В Зоне с ${new Date(g.realTimeStartedAt||Date.now()).toLocaleDateString('ru-RU')}. Твой путь продолжается.`;
 $("playerPortrait").innerHTML=g.playerPortrait?`<div class="npc-portrait portrait-xl"><img src="/assets/portraits/${g.playerPortrait}" alt="Портрет ${escapeHtml(g.name)}"><span class="portrait-faction">${factionIconMarkup(g.faction)}</span></div>`:portraitMarkup({id:'player-'+g.name,name:g.name,faction:g.faction,role:rank,icon:'☻'});
 $("profileStats").innerHTML=[["Репутация",g.rep],["Опыт",g.xp],["Здоровье",g.hp+"%"],["Выносливость",g.stamina+"%"],["Ранг",rank],["Группировка",g.faction]].map(x=>`<div class="stat"><span>${x[0]}</span><strong style="font-size:16px">${escapeHtml(x[1])}</strong></div>`).join("");
 const c=g.careerStats||{},artifacts=g.items.filter(x=>x.type==='Артефакт').reduce((a,x)=>a+x.qty,0),discovered=Object.values(g.keyPoints||{}).flat().filter(p=>p.discovered).length,done=g.quests.filter(q=>q.done).length;
 $("profileCareerStats").innerHTML=[["Победы в столкновениях",c.kills||0],["Найдено артефактов",artifacts],["Открыто точек",discovered],["Заданий выполнено",done],["Локаций посещено",(g.visitedLocations||[g.loc]).length],["Переходов",c.travelled||0]].map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 $("profileRecord").innerHTML=`<div class="record-line"><span>Имя</span><b>${escapeHtml(g.realName||'—')}</b></div><div class="record-line"><span>Позывной</span><b>${escapeHtml(g.name)}</b></div><div class="record-line"><span>Текущий сектор</span><b>${escapeHtml(here().name)}</b></div><div class="record-line"><span>Знакомства</span><b>${g.meetings||0}</b></div><div class="record-line"><span>Время в Зоне</span><b>${Math.max(0,Math.floor((Date.now()-(g.realTimeStartedAt||Date.now()))/86400000))} дн.</b></div>`;
 $("meetingCount").textContent=g.meetings||0;
}
function rename(){let n=prompt("Новый позывной:",g.name);if(n!==null){n=cleanPlayerCallsign(n);if(n.length<2)return alert('Позывной должен содержать минимум 2 символа.');g.name=n;log("Позывной изменён.");save()}}
function chooseFaction(){let names=g.factions.map(f=>f.name),v=prompt("Выбери группировку:\n"+names.join("\n"),g.faction);if(!v)return;if(!names.includes(v))return alert("Такой группировки нет в списке.");g.faction=v;log("Теперь ты состоишь в группировке «"+v+"».");save();mpSyncLocation()}
function renderAtmosphere(){
 const hero=$('homeHero'),info=$('atmosphereInfo');if(!hero||!info)return;
 const bucket=Math.floor(Date.now()/900000),state=g.atmosphereState||{};
 if(state.bucket!==bucket){const weather=['clear','fog','rain','overcast','emission'];const seed=(bucket+String(g.loc||'cordon').length*13)%weather.length;g.atmosphereState={bucket,weather:weather[seed]};}
 const hour=new Date().getHours(),light=hour<6?'night':hour<9?'dawn':hour<17?'day':hour<20?'dusk':'night',weather=g.atmosphereState.weather;
 hero.dataset.weather=weather;hero.dataset.light=light;
 const names={clear:'ЯСНО',fog:'ТУМАН',rain:'ДОЖДЬ',overcast:'ПАСМУРНО',emission:'РАДИАЦИОННЫЙ ФОН'},lights={night:'НОЧЬ',dawn:'РАССВЕТ',day:'ДЕНЬ',dusk:'СУМЕРКИ'};
 info.innerHTML=`<span class="weather-pip"></span><b>${names[weather]}</b><span>·</span><span>${lights[light]}</span><span>·</span><span>${escapeHtml(here().name).toUpperCase()}</span><span class="weather-updated">СВОДКА ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span>`;
}
function radiationLevel(){return window.ZoneSurvival.radiationLevel(g.radiation)}
function tickRadiation(){const result=window.ZoneSurvival.radiationTick(g,g.loc,Date.now());if(result.exposure)save();}
setInterval(()=>{tickRadiation();tickSurvival();if($('inventory')?.classList.contains('active'))renderInventory();},60000);
setInterval(()=>{if($('ranks')?.classList.contains('active'))renderStalkerLeaderboard();if($('factions')?.classList.contains('active'))renderFactionLeaderboard();},15000);
function needPercent(value){const n=Number(value);return Math.round(Math.max(0,Math.min(100,Number.isFinite(n)?n:0)));}
function renderRightIntel(){
 const roster=nearbyNpcs().filter(n=>n.alive!==false),friendly=roster.filter(n=>npcMarkerClass(n)==='marker-friendly').length,hostile=roster.filter(n=>npcMarkerClass(n)==='marker-enemy').length,neutral=roster.length-friendly-hostile;
 const points=g.keyPoints?.[g.loc]||[],known=points.filter(p=>p.discovered).length;
 const sector=$('sectorIntel');if(sector)sector.innerHTML=`<div class="intel-location-name">${escapeHtml(here().name)}</div><div class="intel-grid"><div><small>КОНТАКТЫ</small><b>${roster.length}</b></div><div><small>СОЮЗНИКИ</small><b class="intel-friendly">${friendly}</b></div><div><small>НЕЙТРАЛЫ</small><b>${neutral}</b></div><div><small>УГРОЗЫ</small><b class="intel-hostile">${hostile}</b></div><div><small>ИЗУЧЕНО ТОЧЕК</small><b>${known}/${points.length}</b></div><div><small>РЕПУТАЦИЯ</small><b>${Number(g.rep||0)}</b></div></div><div class="intel-footnote">Сведения обновляются при изменении обстановки в секторе.</div>`;
 const signals=$('fieldSignals');if(signals){const newsItems=(g.news||[]).slice(0,3);signals.innerHTML=`<div class="intel-signal-row"><span>ПОГОДА</span><b>${escapeHtml(g.world?.weather||'неизвестно')}</b></div><div class="intel-signal-row"><span>АКТИВНОСТЬ ВЫБРОСА</span><b>${escapeHtml(g.world?.emission||'нет данных')}</b></div><div class="intel-signal-row"><span>АКТИВНОСТЬ МУТАНТОВ</span><b>${escapeHtml(g.world?.mutants||'нет данных')}</b></div><div class="intel-news-list">${newsItems.map(n=>`<div><b>${escapeHtml(n.title||'Сообщение КПК')}</b><small>${escapeHtml(n.body||'')}</small></div>`).join('')||'<div class="mutedbox small">Новых сообщений пока нет.</div>'}</div>`;}
}
function render(){let l=here();const hp=$("headerPlayerPortrait");if(hp)hp.innerHTML=g.playerPortrait?`<div class="npc-portrait"><img src="/assets/portraits/${g.playerPortrait}" alt="Портрет ${escapeHtml(g.name)}"><span class="portrait-faction">${factionIconMarkup(g.faction)}</span></div>`:portraitMarkup({id:"player-"+g.name,name:g.name,faction:g.faction,role:"Сталкер",icon:"♙"});const hn=$("headerPlayerName"),hf=$("headerPlayerFaction");if(hn)hn.textContent=playerDisplayName();if(hf)hf.textContent=g.faction||"Одиночки";$("topMoney").textContent=g.money.toLocaleString("ru-RU");$("topHp")&&($("topHp").textContent=g.hp+"%");$("topHunger")&&($("topHunger").textContent=needPercent(g.hunger)+"%");$("topThirst")&&($("topThirst").textContent=needPercent(g.thirst)+"%");const radEl=$("topRadiation");if(radEl)radEl.textContent=Math.round(radiationLevel())+"%";$("topDay").textContent=realClock().stamp;$("topLoc").textContent=l.name;$("sMoney").textContent=g.money+" ₽";$("sHp").textContent=g.hp+"%";$("sRep").textContent=g.rep;$("sDay").textContent=g.day;
$("nearby").innerHTML=nearbyNpcs().slice(0,3).map(n=>`<div class="item"><div><b>${n.icon} ${n.name}</b><div class="desc">${n.role} · ${n.desc}</div></div><button onclick="meet('${n.id}')">Подойти</button></div>`).join("")||'<div class="mutedbox">Поблизости никого нет.</div>';
$("homeNews").textContent=g.news[0]?g.news[0].title+": "+g.news[0].body:"Пока без новостей.";
renderRightIntel();
$("worldState").innerHTML=`<div class="item"><span>Аномальная активность</span><b>${g.world.emission}</b></div><div class="item"><span>Мутанты</span><b>${g.world.mutants}</b></div><div class="item"><span>Напряжённость</span><b>${g.world.tension}%</b></div>`;
applyGameOptions();renderAtmosphere();renderOverviewFactionFront();renderMap();renderKeyPoints();renderStories();renderArmory();renderEncyclopedia();renderPeople();renderQuests();renderInventory();renderTrade();renderFactions();renderArchive();renderDiplomacy();renderAchievements();renderNews();renderCraft();renderProfile();renderLivingZone();renderFieldwork();renderSurvival();renderSurvivalHud();$("log").innerHTML=g.log.map((x,i)=>`<div><time>${String(i+1).padStart(2,"0")}</time>${escapeHtml(x)}</div>`).join("")}
function exportSave(){let blob=new Blob([JSON.stringify(g,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="zone-online-save.json";a.click();URL.revokeObjectURL(a.href)}
function sanitizeImportedValue(value,depth=0){
 if(depth>12)return null;
 if(typeof value==='string')return value.replace(/[<>\u0000-\u001f]/g,'').slice(0,5000);
 if(typeof value==='number')return Number.isFinite(value)?value:0;
 if(typeof value==='boolean'||value===null)return value;
 if(Array.isArray(value))return value.slice(0,5000).map(v=>sanitizeImportedValue(v,depth+1));
 if(value&&typeof value==='object'){const out={};for(const [key,item] of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))continue;out[key.slice(0,100)]=sanitizeImportedValue(item,depth+1);}return out;}
 return null;
}
function importSave(e){let f=e.target.files[0];if(!f)return;if(f.size>5*1024*1024){alert('Файл сохранения слишком большой (максимум 5 МБ).');e.target.value='';return;}let r=new FileReader();r.onload=()=>{try{let parsed=JSON.parse(r.result);if(!parsed||!Array.isArray(parsed.locations)||!Array.isArray(parsed.npcs)||!Array.isArray(parsed.items))throw Error();let d=sanitizeImportedValue(parsed);g={...clone(base),...d};g.locations=Array.isArray(d.locations)?d.locations:clone(base.locations);g.npcs=Array.isArray(d.npcs)?d.npcs:clone(base.npcs);g.items=Array.isArray(d.items)?d.items:[];g.equipment={...clone(base.equipment),...(d.equipment&&typeof d.equipment==='object'?d.equipment:{})};save();render();alert('Сохранение загружено.');}catch(err){alert('Файл сохранения не распознан.');}finally{e.target.value='';}};r.readAsText(f)}
function manualSave(){save();alert("Игра сохранена в этом браузере.")}
function resetGame(){if(confirm("Начать заново? Текущее локальное сохранение будет заменено.")){g=clone(base);activeNpc=null;chosenLoc=null;save();view("home")}}
// GLOBAL ONLINE WORLD state must exist before the first render: renderPeople()
 // reads serverWorld while building the initial NPC roster.
let zoneSocket=null, zoneSocketTarget='', zoneHelloReadyTimer=null, zoneConnectAttempt=0, zonePlayerReady=false, zonePlayerId=localStorage.getItem('zoneOnlinePlayerId')||'';
// Guest-only release: discard obsolete account credentials from older builds.
localStorage.removeItem('zoneAccountToken');localStorage.removeItem('zoneAccountUsername');
const factionSpawn={ 'Одиночки':'cordon','Долг':'bar','Свобода':'army','Бандиты':'dump','Военные':'agro','Учёные':'yantar','Наёмники':'limansk','Монолит':'radar','Чистое небо':'swamps','Ренегаты':'darkhollow' };
const factionGuides={ 'Одиночки':{name:'Седой',base:'cordon'},'Долг':{name:'Комендант',base:'bar'},'Свобода':{name:'Шустрый',base:'army'},'Бандиты':{name:'Косой',base:'dump'},'Военные':{name:'Старшина',base:'agro'},'Учёные':{name:'Навигатор',base:'yantar'},'Наёмники':{name:'Курьер',base:'limansk'},'Монолит':{name:'Паломник',base:'radar'},'Чистое небо':{name:'Туман',base:'swamps'},'Ренегаты':{name:'Кривой',base:'darkhollow'} };
const guideBaseFare=8500;
function guideFare(destination){const l=g.locations.find(x=>x.id===destination);const d=Math.max(1,Number(l?.travel)||1);return Math.max(4500,Math.round((guideBaseFare+d*2100)*(1-(Number(g.guideDiscount)||0))));}
function useFactionGuide(destination){const guide=factionGuides[g.faction],target=g.locations.find(x=>x.id===destination);if(!guide||!target||destination===g.loc)return alert('Проводник не может выполнить этот переход.');if(g.loc!==guide.base)return alert(`Проводник ${guide.name} принимает заказы только на базе «${locationName(guide.base)}».`);if(!(g.visitedLocations||[]).includes(destination))return alert('Проводник согласен вести только в уже посещённые тобой сектора. Сначала открой маршрут обычной экспедицией.');if(activePlayerSquad&&activePlayerSquad.leader!==zonePlayerId)return alert('Маршрутом отряда управляет командир.');const fare=guideFare(destination);if(g.money<fare)return alert(`Услуги проводника стоят ${fare.toLocaleString('ru-RU')} ₽. Не хватает денег.`);if(!confirm(`${guide.name}, проводник группировки «${g.faction}», доставит тебя в «${target.name}» за ${fare.toLocaleString('ru-RU')} ₽. Переместиться?`))return;g.money-=fare;g.loc=destination;g.visitedLocations=[...new Set([...(g.visitedLocations||[]),destination])];g.worldPosition=null;g.expedition=null;g.guideTrips=(g.guideTrips||0)+1;g.log.unshift(`Переход с проводником ${guide.name}: ${target.name}. Оплата ${fare} ₽.`);g.news.unshift({day:realClock().day,hour:realClock().time,title:'Переход с проводником',body:`${g.name} прибыл в ${target.name}. Проводник: ${guide.name} (${g.faction}). Оплата: ${fare} ₽.`});save();mpSyncLocation();render();renderMap();renderZoneMap();selectLocation(destination);}

const spawnNames={cordon:'Кордон',bar:'Бар',army:'Военные склады',dump:'Свалка',agro:'Агропром',yantar:'Янтарь',limansk:'Лиманск',radar:'Радар',swamps:'Болота',darkhollow:'Тёмная Лощина'};
let onlinePlayers=[], serverWorld=null, serverChat=[], incomingTrades=[], activePlayerSquad=null, activePlayerTradeTarget=null;
let serverLeaderboard=[], selectedRankId='', rankRecentEvents=[];
let applyingServerState=false;

render();
const realClockTimer=setInterval(()=>{
 const el=$("topDay");if(el)el.textContent=realClock().stamp;
 // Offline browser mode still advances the local simulation on wall-clock time only.
 {const now=Date.now();if(!g.lastLocalWorldPulseAt)g.lastLocalWorldPulseAt=now;if(now-g.lastLocalWorldPulseAt>=window.ZoneCoreConfig.localWorldPulseMs){g.lastLocalWorldPulseAt=now;livingWorldTick();if(!zoneSocket?.connected)roamNPCs();log("Мир обновился по реальному времени. Новая сводка доступна в КПК.");save();}}
},15000);

// GLOBAL ONLINE WORLD: one shared server, no private rooms.
function renderOnlinePlayers(){
 const make=(p)=>`<div class="item"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><b>🟢 ${escapeHtml(p.name)}</b><div class="desc">${escapeHtml(p.faction)} · ${escapeHtml(locationName(p.location))}</div></div><span class="tag">${p.hp}% HP</span></div>${p.id!==zonePlayerId&&p.location===g.loc?`<button class="quiet-action" onclick="view('multiplayer');openPlayerDM('${p.id}')">✉ Личное сообщение</button><button class="quiet-action" onclick="squadAction('invite','${p.id}')">＋ В отряд</button><button class="quiet-action" onclick="friendRequest('${p.id}')">★ В друзья</button>`:''}</div>`;
 const all=onlinePlayers.map(make).join('')||'<div class="mutedbox small">Сейчас никого нет. Ты можешь быть первым.</div>';
 const a=$('mpPlayers');if(a)a.innerHTML=all;
 const b=$('nearbyPlayers');if(b){const near=onlinePlayers.filter(p=>p.id!==zonePlayerId&&p.location===g.loc);b.innerHTML=near.map(make).join('')||'<div class="mutedbox small">В этом секторе пока нет других игроков.</div>';}
 const status=$('mpStatus');if(status)status.textContent=zoneSocket?.connected?'🟢 Подключено к общей Зоне':'🔴 Нет соединения';
 const statusText=$('mpStatusText');if(statusText)statusText.textContent=`Онлайн: ${onlinePlayers.length} · ${zoneSocket?.connected?'все игроки видят друг друга':'переподключение…'}`;
}
function locationName(id){return g.locations.find(x=>x.id===id)?.name||id||'Неизвестно'}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function syncNpcRosterToClient(){
 migrateLocalNpcCallsigns();
 const roster=serverWorld?.npcState||{};g.npcs||=[];
 for(const npc of Object.values(roster)){
  if(!npc)continue;
  let local=g.npcs.find(x=>x.id===npc.id);
  if(npc.alive===false){if(local)local.alive=false;continue;}
  
  if(!local){local={id:npc.id,name:npc.name,role:npc.role||'сталкер',loc:npc.location,faction:npc.faction,icon:npc.icon||'◉',desc:`${npc.personality||'обычный'} сталкер. ${npc.action==='travel'?'Сейчас в пути.':'Находится в секторе.'}`,mood:npc.mood||'нейтральное',generated:!!npc.generated,topics:[],greeting:''};g.npcs.push(local);}
  local.name=npc.name||local.name;local.loc=npc.location||local.loc;local.location=local.loc;if(npc.x!==null&&npc.x!==undefined&&npc.y!==null&&npc.y!==undefined&&Number.isFinite(Number(npc.x))&&Number.isFinite(Number(npc.y))){local.x=Number(npc.x);local.y=Number(npc.y);}local.faction=npc.faction||local.faction;local.role=npc.role||local.role;local.icon=npc.icon||local.icon;local.generated=!!npc.generated;local.supportSpecialist=!!npc.supportSpecialist;local.mood=npc.mood||local.mood;local.health=Number.isFinite(Number(npc.health))?Number(npc.health):local.health;local.morale=Number.isFinite(Number(npc.morale))?Number(npc.morale):local.morale;local.supplies=Number.isFinite(Number(npc.supplies))?Number(npc.supplies):local.supplies;local.action=npc.action||local.action;local.behavior=npc.behavior||local.behavior;local.duty=npc.duty||local.duty;local.guardPost=!!npc.guardPost;local.homeLocation=npc.homeLocation||local.homeLocation;local.alive=npc.alive!==false;local.biography=npc.biography||local.biography;local.friends=npc.friends||[];local.rivals=npc.rivals||[];local.squadId=npc.squadId||null;local.squadName=npc.squadName||local.squadName;local.personality=npc.personality||local.personality;local.dialogueVersion=npc.dialogueVersion||0;local.route=Array.isArray(npc.route)?npc.route.slice():[];local.destination=npc.destination||null;local.destinationPoint=npc.destinationPoint||null;local.missionOrder=npc.missionOrder||null;local.direction=npc.direction??local.direction;
  if(npc.dialogue){local.greeting=npc.dialogue.greeting;local.topics=npc.dialogue.topics;}
 }
 for(const l of g.locations||[])l.people=(g.npcs||[]).filter(n=>n.loc===l.id&&(!roster[n.id]||roster[n.id].alive!==false)).map(n=>n.id);
}
function applySharedNpcPositions(positions){
 if(!positions||typeof positions!=='object')return;
 serverWorld=serverWorld||{};serverWorld.npcPositions=positions;
 for(const n of g.npcs||[]){if(positions[n.id]&&g.locations.some(l=>l.id===positions[n.id]))n.loc=positions[n.id];}
 syncNpcRosterToClient();renderPeople();renderQuick();if($('people').classList.contains('active'))renderPeople();
}
function renderPlayerTrade(){const el=$('playerTrade');if(!el)return;const others=onlinePlayers.filter(p=>p.id!==zonePlayerId&&(!activePlayerTradeTarget||p.id===activePlayerTradeTarget));if(!others.length){el.innerHTML='<div class="mutedbox small">Пока нет других игроков онлайн.</div>';return;}
 const allowed=new Set(['med','bread','bolt','scrap','bandage','anti_rad','painkillers','trauma_kit','artifact','canned','sausage','condensed','water','tea','ration','artifact_medusa','artifact_flower','artifact_dummy','artifact_meat','artifact_flash','artifact_nightstar','artifact_soul','artifact_goldfish','armor_leather','armor_stalker','armor_zarya','armor_seva','armor_bulat','armor_exo','mutant_trophy','energy_drink','chocolate','nuts','smoked_meat','weapon_pm','weapon_aks74u','weapon_toz34','weapon_ak74','weapon_vintar']);
 const items=(g.items||[]).filter(x=>x.qty>0&&allowed.has(x.id));
 el.innerHTML=others.map(p=>{const sameSector=p.location===g.loc,distance=playerDistanceMeters(p),exactDistance=playerDistanceExact(p),canTrade=sameSector&&exactDistance!==null&&exactDistance<=8;return `<div class="item block"><b>${escapeHtml(p.name)}</b><div class="desc">${escapeHtml(p.faction)} · ${escapeHtml(locationName(p.location))}</div>${canTrade?`<div class="small" style="margin-top:5px;color:var(--good)">Рядом · ${distance} м — можно торговать</div>`:`<div class="small muted" style="margin-top:5px">${sameSector?(distance===null?'Нет координат игрока':`Подойди ближе: сейчас ${distance} м, нужно не более 8 м`):'Для торговли встретьтесь в одном секторе'}</div>`}<div class="rightbuttons" style="margin-top:7px"><select class="field" id="tradeItem_${p.id}" ${items.length&&canTrade?'':'disabled'}>${items.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)} · есть ${x.qty}</option>`).join('')||'<option value="">Нет доступных предметов</option>'}</select><input class="field" id="tradeQty_${p.id}" type="number" min="1" max="99" value="1" style="width:62px" ${canTrade&&items.length?'':'disabled'}><input class="field" id="tradePrice_${p.id}" type="number" min="0" max="1000000" value="0" style="width:82px" placeholder="₽" ${canTrade&&items.length?'':'disabled'}><button onclick="sendPlayerTrade('${p.id}')" ${canTrade&&items.length?'':'disabled'}>Предложить</button></div></div>`;}).join('');
}
function sendPlayerTrade(to){if(!zoneSocket?.connected)return alert('Нет соединения.');const item=$(`tradeItem_${to}`)?.value,qty=Number($(`tradeQty_${to}`)?.value),price=Number($(`tradePrice_${to}`)?.value);if(!item)return alert('В рюкзаке нет предметов, доступных для обмена.');zoneSocket.emit('trade:offer',{to,item,qty,price});}
function renderIncomingTrades(){const el=$('incomingTrades');if(!el)return;const now=Date.now();incomingTrades=incomingTrades.filter(o=>Number(o.expiresAt||0)>now);el.innerHTML=incomingTrades.map(o=>`<div class="item block"><b>${escapeHtml(o.fromName)}</b><div class="desc">Предлагает: ${escapeHtml(o.itemName)} ×${o.qty} за ${o.price} ₽</div><div class="small muted">Предложение действует ограниченное время</div><div class="rightbuttons"><button onclick="respondTrade('${o.id}',true)">Принять</button><button onclick="respondTrade('${o.id}',false)">Отклонить</button></div></div>`).join('')||'<div class="mutedbox small">Нет входящих предложений.</div>';}
function respondTrade(offerId,accept){if(!zoneSocket?.connected)return alert('Нет соединения.');zoneSocket.emit('trade:respond',{offerId,accept});}
function renderCoopQuests(list){const el=$('coopQuestList');if(!el)return;el.innerHTML=(list||[]).map(q=>{const joined=q.participants?.includes(zonePlayerId),arrived=q.arrivals?.includes(zonePlayerId);return `<div class="item block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${escapeHtml(q.title)}</b><span class="tag">${q.done?'Выполнено':`${q.arrivals?.length||0}/${q.required} прибыли`}</span></div><div class="desc">${escapeHtml(q.description)} · сектор: ${escapeHtml(locationName(q.location))}</div><div class="small">Группа: ${q.participants?.length||0} · награда: ${q.reward} ₽ и ${q.xp} опыта</div><div class="rightbuttons" style="margin-top:7px">${!joined&&!q.done?`<button onclick="joinCoop('${q.id}')">Вступить</button>`:''}${joined&&!arrived&&!q.done?`<button onclick="contributeCoop('${q.id}')">Отметить прибытие</button>`:''}</div></div>`}).join('')||'<div class="mutedbox small">Пока нет совместных заданий.</div>';}
function joinCoop(id){zoneSocket?.emit('coop:join',{questId:id});}
function contributeCoop(id){zoneSocket?.emit('coop:contribute',{questId:id});}
function renderServerChat(){const el=$('mpChat');if(!el)return;if($('localChatHeading'))$('localChatHeading').textContent=`Локальный канал КПК · ${locationName(g.loc)}`;el.innerHTML='';for(const m of serverChat.slice(-80)){const row=document.createElement('div');row.style.padding='5px 8px';const time=new Date(m.time||Date.now()).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});row.textContent=`[${time}] ${m.name}: ${m.text}`;el.appendChild(row);}el.scrollTop=el.scrollHeight;}
function mpSend(){const input=$('mpMessage');const text=input?.value?.trim();if(!text)return;if(!zoneSocket?.connected)return alert('Нет соединения с сервером.');zoneSocket.emit('world:chat:send',{text});input.value='';}
function mpRename(){const n=cleanPlayerCallsign($('mpName')?.value);if(n.length<2)return alert('Позывной должен содержать минимум 2 символа.');g.name=n;save();}
function mpSyncLocation(){if(zoneSocket?.connected)zoneSocket.emit('player:update',{location:g.loc,faction:g.faction,name:g.name});}

// Character creation: faction and callsign are chosen before entering the world.
// Character creation is applied by ZoneCharacterCreation; legacy field semantics remain: g.name=name;g.realName=realName; g.startingSupplyPoints={spent,budget:STARTER_BUDGET};
// Background rules (medic, technician, researcher, courier, wanderer) are implemented in the creation domain module.
const { factionLore, SETUP_FIRST_NAMES, SETUP_CALLSIGNS, setupBackgrounds, STARTER_BUDGET, STARTER_GEAR, STARTER_WEAPON_SERVER_IDS, factionSuit } = window.ZoneCharacterSetupData;
const characterSetupProfile = window.ZoneCharacterSetupProfile;


let setupFaction='Одиночки';



function pickSetup(list){return list[Math.floor(Math.random()*list.length)];}
function generateSetupRealName(){const el=$('setupRealName');if(el)el.value=pickSetup(SETUP_FIRST_NAMES);updateSetupPreview();}
function generateSetupCallsign(){const el=$('setupCallsign');if(el)el.value=pickSetup(SETUP_CALLSIGNS);updateSetupPreview();}
function generateSetupIdentity(){generateSetupRealName();generateSetupCallsign();}
let setupBackground='wanderer';
const characterPortraitPicker=characterSetupProfile.createPortraitPicker({getElement:$});

function selectSetupBackground(id){const normalized=characterSetupProfile.normalizeBackground(id,setupBackgrounds,setupBackground);if(!normalized)return;setupBackground=normalized;const d=setupBackgrounds[normalized];if($('setupBackgroundDesc'))$('setupBackgroundDesc').textContent=d.desc;}
function renderSetupPortraits(){characterPortraitPicker.render();}
function openSetupPortraitPicker(){characterPortraitPicker.open();}
function closeSetupPortraitPicker(){characterPortraitPicker.close();}
function chooseSetupPortrait(file){characterPortraitPicker.choose(file);}



// The armory catalogue is larger than the legacy starter list. Expose all
// weapons that have canonical server-side inventory IDs; unsupported catalogue
// aliases stay in the encyclopaedia and are not minted into player inventory.

for(const row of weaponCatalogue){
 const [id,name,category,type,caliber,weight,price,rating]=row;
 if(!STARTER_WEAPON_SERVER_IDS.has(id)||STARTER_GEAR[id])continue;
 const cost=Number(price)||1000;
 STARTER_GEAR[id]={id,name,type:'Оружие',desc:`${type}. Калибр: ${caliber}.`,weight:Number(weight)||1,value:Math.round(cost*.45),power:Math.max(12,Math.round((Number(rating)||70)/5)),price:cost,points:Math.round(45+Math.sqrt(cost)*1.3),slot:'weapon'};
}
const STARTER_WEAPON_OPTIONS=Object.values(STARTER_GEAR).filter(item=>item.slot==='weapon').map(item=>item.id);
let setupLoadout={weapon:'weapon_pm',suit:'armor_leather',tool:'detector_echo',backpack:'backpack_standard',supplies:['med','bread','bandage']};
const characterLoadoutSystem=window.ZoneCharacterLoadout.createCharacterLoadoutSystem({getLoadout:()=>setupLoadout,setLoadout:value=>{setupLoadout=value;},getGear:()=>STARTER_GEAR,budget:STARTER_BUDGET});
function setupSelectedItems(){return characterLoadoutSystem.selectedItems();}
function setupSpent(){return characterLoadoutSystem.spent();}

function renderSetupLoadout(){
 const root=$('setupLoadoutChoices');if(!root)return;
 const suitOptions=['armor_none','armor_leather','armor_stalker','armor_zarya','armor_duty','armor_freedom','armor_bandit','armor_military','armor_ecologist','armor_merc','armor_monolith','armor_clearsky','armor_renegade','armor_sunrise','armor_berill','armor_guardian','armor_cs3a','armor_ps5m','armor_duty_veteran','armor_duty_defender','armor_freedom_wind','armor_freedom_wanderer','armor_military_guard','armor_military_kordon','armor_merc_contract','armor_merc_blue','armor_clearsky_azure','armor_loner_mist','armor_monolith_acolyte','armor_bandit_collector','armor_renegade_marsh','armor_science_expedition'];
 const fields=[['weapon','Основной слот',STARTER_WEAPON_OPTIONS],['suit','Фракционный бронекостюм',suitOptions],['tool','Детектор',['detector_none','detector_echo','detector_bear']],['backpack','Рюкзак',['backpack_standard','backpack_field','backpack_expedition']]];
 const select=(key,label,ids)=>`<label class="setup-choice"><span>${label}</span><select class="field" data-setup-slot="${key}" onchange="changeSetupSlot('${key}',this.value)">${ids.map(id=>{const item=STARTER_GEAR[id];return `<option value="${id}" ${setupLoadout[key]===id?'selected':''}>${item.name} · ${item.points} очк.</option>`}).join('')}</select><small>${escapeHtml(STARTER_GEAR[setupLoadout[key]]?.desc||'')}</small></label>`;
 const supplies=[['med','Аптечка'],['bandage','Бинт'],['anti_rad','Антирад'],['bread','Хлеб'],['canned','Консервы'],['water','Вода']];
 root.innerHTML=`<div class="setup-choice-grid">${fields.map(f=>select(...f)).join('')}</div><div class="setup-supplies-head">ПРИПАСЫ / ДОБАВЛЯЙ ИЛИ УБИРАЙ</div><div class="setup-supplies">${supplies.map(([id,label])=>{const count=setupLoadout.supplies.filter(x=>x===id).length;return `<div class="setup-supply-row"><span>${label} <small>${STARTER_GEAR[id].points} очк. · ${count} шт.</small></span><div><button type="button" onclick="changeSetupSupply('${id}',-1)" aria-label="Убрать ${label}">−</button><b>${count}</b><button type="button" onclick="changeSetupSupply('${id}',1)" aria-label="Добавить ${label}">+</button></div></div>`}).join('')}</div>`;
 updateSetupBudget();
}
function changeSetupSlot(slot,id){
 const result=characterLoadoutSystem.setSlot(slot,id);
 if(!result.ok){if(result.reason==='over-budget'){renderSetupLoadout();const note=$('setupLoadoutNote');if(note){note.textContent='Этот предмет превышает остаток бюджета. Выбери более доступный вариант или убери припасы.';note.classList.add('over-budget');}}return;}
 renderSetupLoadout();
}
function changeSetupSupply(id,delta){
 const result=characterLoadoutSystem.changeSupply(id,delta);
 if(!result.ok){if(result.reason==='over-budget'){renderSetupLoadout();const note=$('setupLoadoutNote');if(note){note.textContent='Недостаточно очков снабжения для этого припаса.';note.classList.add('over-budget');}}return;}
 renderSetupLoadout();
}
function updateSetupBudget(){
 const spent=setupSpent(),left=STARTER_BUDGET-spent,spentEl=$('setupPointsSpent'),leftEl=$('setupPointsLeft'),bar=$('setupBudgetBar'),note=$('setupLoadoutNote');
 if(spentEl)spentEl.textContent=spent;if(leftEl)leftEl.textContent=Math.max(0,left);if(bar)bar.style.width=Math.min(100,spent/STARTER_BUDGET*100)+'%';
 const total=$('setupBudgetTotal'),max=$('setupBudgetMax');if(total)total.textContent=STARTER_BUDGET;if(max)max.textContent=STARTER_BUDGET;
 if(note){note.textContent=left<0?'Превышен лимит. Убери несколько предметов.':`Осталось ${left} очков снабжения. Неиспользованные очки не сгорают.`;note.classList.toggle('over-budget',left<0);}
 const start=$('setupStartButton');if(start)start.disabled=left<0;
}
function updateSetupPreview(){
 const name=cleanPlayerCallsign($('setupCallsign')?.value)||'НОВЫЙ СТАЛКЕР',realName=($('setupRealName')?.value||'').trim(),spawn=$('setupSpawnSelect')?.value||factionSpawn[setupFaction]||'cordon';
 if($('setupPreviewName'))$('setupPreviewName').textContent=((realName?realName+' ':'')+name).toUpperCase();
 if($('setupPreviewFaction'))$('setupPreviewFaction').textContent=setupFaction;
 if($('setupPreviewSpawn'))$('setupPreviewSpawn').textContent=`Точка появления: ${spawnNames[spawn]||spawn}`;characterPortraitPicker.render();const bg=setupBackgrounds[setupBackground];if($('setupBackgroundDesc')&&bg)$('setupBackgroundDesc').textContent=bg.desc;
 if($('setupStarterContract'))$('setupStarterContract').textContent=setupFaction==='Одиночки'?'На Кордоне Волк поможет освоиться, а Сидорович предложит первую работу.':`На базе «${setupFaction}» тебя встретит представитель группировки и выдаст первое поручение.`;
}
function resetStarterLoadout(){characterLoadoutSystem.reset({suit:factionSuit[setupFaction]||'armor_leather'});renderSetupLoadout();}
function randomizeStarterLoadout(){
 const groups={weapon:STARTER_WEAPON_OPTIONS,suit:['armor_none','armor_leather','armor_stalker','armor_zarya',factionSuit[setupFaction]||'armor_stalker'],tool:['detector_none','detector_echo','detector_bear'],backpack:['backpack_standard','backpack_field','backpack_expedition']};
 let tries=0;do{for(const [slot,ids] of Object.entries(groups))setupLoadout[slot]=ids[Math.floor(Math.random()*ids.length)];setupLoadout.supplies=['med','bread','bandage'];if(Math.random()>.5)setupLoadout.supplies.push('anti_rad');if(Math.random()>.5)setupLoadout.supplies.push('water');tries++;}while(setupSpent()>STARTER_BUDGET&&tries<100);
 if(setupSpent()>STARTER_BUDGET)resetStarterLoadout();else renderSetupLoadout();
}
function setupSpawnOptions(faction){return characterSetupProfile.spawnOptions(faction,g.locations,factionSpawn);}
function updateSetupSpawnOptions(preferred){const options=setupSpawnOptions(setupFaction),select=$('setupSpawnSelect');if(!select)return;const allowed=characterSetupProfile.resolveSpawn(preferred,options,factionSpawn[setupFaction]||'cordon');select.innerHTML=options.map(l=>`<option value="${l.id}">${escapeHtml(l.name)}${l.id===(factionSpawn[setupFaction]||'')?' · основная база':''}</option>`).join('');select.value=allowed;const l=options.find(x=>x.id===allowed);if($('setupSpawnInfo'))$('setupSpawnInfo').textContent=`Место начала: ${l?.name||locationName(allowed)}. Доступны только территории твоей группировки.`;updateSetupPreview();}
function openCharacterSetup(){
 const root=$('characterSetup');if(!root)return;if(factionSuit[setupFaction]&&setupLoadout.suit==='armor_leather')setupLoadout.suit=factionSuit[setupFaction];
 $('setupCallsign').value=g.name==='Новичок'?'':g.name;$('setupRealName').value=(g.realName||'').trim().split(/\s+/)[0]||'';
 $('setupFactions').innerHTML=g.factions.map(f=>`<button type="button" class="faction-choice ${setupFaction===f.name?'selected':''}" onclick="selectSetupFaction('${f.name.replace(/'/g,"\\'")}')"><b>${f.icon||'◉'} ${f.name}</b><div class="desc">${f.style||''}</div></button>`).join('');
 $('factionDescription').textContent=factionLore[setupFaction]||'Выбранная сторона Зоны.';updateSetupSpawnOptions(g.startingLocation||factionSpawn[setupFaction]||'cordon');
 renderSetupLoadout();renderSetupPortraits();if($('setupBackground'))$('setupBackground').value=setupBackground;selectSetupBackground(setupBackground);updateSetupPreview();root.classList.add('show');
}
function selectSetupFaction(name){const current=$('setupCallsign').value,real=$('setupRealName').value;setupFaction=name;if(factionSuit[name])setupLoadout.suit=factionSuit[name];if(setupSpent()>STARTER_BUDGET)resetStarterLoadout();openCharacterSetup();updateSetupSpawnOptions(factionSpawn[setupFaction]||'cordon');$('setupCallsign').value=current;$('setupRealName').value=real;updateSetupPreview();}
function confirmCharacter(){
 const name=cleanPlayerCallsign($('setupCallsign').value);let realName=cleanPlayerCallsign($('setupRealName').value).split(/\s+/)[0];if(!realName){realName=pickSetup(SETUP_FIRST_NAMES);$('setupRealName').value=realName;}
 const identity=characterSetupProfile.validateIdentity({callsign:name,realName,faction:setupFaction,factions:g.factions});
 if(identity.reason==='callsign')return alert('Позывной должен содержать минимум 2 символа.');if(identity.reason==='real-name')return alert('Укажи имя персонажа.');if(identity.reason==='faction')return alert('Выбери группировку из списка.');
 // A fresh profile is cloned from the base template, so run migrations again to seed the selected faction's quest catalog.
 migrateWorld();
 const spent=setupSpent();
 const spawn=$('setupSpawnSelect')?.value||factionSpawn[setupFaction]||'cordon';
 const result=window.ZoneCharacterCreation.apply({character:g,name,realName,faction:setupFaction,portrait:characterPortraitPicker.getSelected(),background:setupBackground,spawn,loadout:setupLoadout,selectedItems:setupSelectedItems(),gear:STARTER_GEAR,spent,budget:STARTER_BUDGET,spawnOptions:setupSpawnOptions(setupFaction),spawnNames,day:realClock().day,hour:realClock().time});
 if(!result.ok){
  if(result.reason==='callsign')return alert('Позывной должен содержать минимум 2 символа.');
  if(result.reason==='real-name')return alert('Укажи имя персонажа.');
  if(result.reason==='faction')return alert('Выбери группировку из списка.');
  if(result.reason==='over-budget')return alert('Комплект превышает лимит очков снабжения.');
  if(result.reason==='spawn')return alert('Выбранная стартовая локация не принадлежит твоей группировке.');
  return alert('Не удалось создать персонажа. Проверь выбранные данные.');
 }
 $('characterSetup').classList.remove('show');document.body.classList.remove('title-screen-active');save();mpSyncLocation();renderInventory();
}
// Turn-based fictional combat. It uses abstract game stats, not real-world tactics.
let battle=null;
function playerDeath(cause='погиб в Зоне',fromServer=false){
 const deaths=(Number(g.deathCount)||0)+1,options=clone(g.options||{});
 battle=null;$('combatOverlay')?.classList.remove('show');
 g=clone(base);g.options=options;g.deathCount=deaths;g.hp=0;g.characterCreated=false;g.lastDeath={cause:String(cause),at:Date.now()};
 g.news.unshift({day:g.day,hour:realClock().time,title:'Сталкер погиб',body:`Персонаж погиб: ${cause}. Создай нового сталкера, чтобы вернуться в Зону.`});
 g.log.unshift(`Персонаж погиб: ${cause}. Начни новую жизнь в Зоне.`);
 if(!fromServer&&zoneSocket?.connected)zoneSocket.emit('player:character-death',{cause:String(cause)});save();openCharacterSetup();$('characterSetup')?.classList.add('show');
}
function equippedWeapon(){return g.items.find(x=>x.name===g.equipment?.weapon&&x.type==='Оружие')||g.items.find(x=>x.type==='Оружие')||null;}
function renderQuickUseBar(){
 const bar=$('quickUseBar');if(!bar)return;
 bar.innerHTML=QUICK_USE_SLOTS.map(slot=>{
  const item=g.items.find(x=>x.id===slot.id&&Number(x.qty)>0),qty=item?Number(item.qty):0;
  return `<button type="button" class="quick-use-slot ${item?'has-item':'is-empty'}" ${item?`onclick="quickUseItem('${slot.id}')"`:'disabled'} title="${slot.label}${item?' · использовать':''}" aria-label="${slot.label}, количество ${qty}">
   <span class="quick-use-icon">${slot.icon}</span><span class="quick-use-name">${slot.label}</span><b class="quick-use-qty">${item?'×'+qty:'—'}</b>
  </button>`;
 }).join('');
}
function quickUseItem(id){
 const item=g.items.find(x=>x.id===id&&Number(x.qty)>0);
 if(!item)return;
 if(id==='med'&&g.hp>=100){log('Аптечка не использована: здоровье уже полное.');return;}
 useItem(id);
}
function renderSurvivalHud(){
 const hud=$('survivalHud');if(!hud)return;
 const hp=Math.max(0,Math.min(100,Number(g.hp)||0)),st=Math.max(0,Math.min(100,Number(g.stamina)||0));
 const setText=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
 setText('hudHungerValue',Math.round(needPercent(g.hunger))+'%');
 setText('hudThirstValue',Math.round(needPercent(g.thirst))+'%');
 setText('hudRadiationValue',Math.round(radiationLevel())+'%');
 setText('hudStaminaCompact',Math.round(st)+'%');
 renderQuickUseBar();
 const health=$('hudHealthTicks'),stamina=$('hudStaminaTicks');
 const ticks=(value,kind)=>Array.from({length:28},(_,i)=>`<i class="${i<Math.ceil(value/100*28)?'is-on':''}"></i>`).join('');
 if(health)health.innerHTML=ticks(hp,'health');if(stamina)stamina.innerHTML=ticks(st,'stamina');
 $('hudHealthValue').textContent=Math.round(hp)+'%';$('hudStaminaValue').textContent=Math.round(st)+'%';
 const weapon=equippedWeapon(),name=weapon?.name||'Оружие не выбрано',condition=Math.max(0,Math.min(100,Number(weapon?.condition??0)));
 $('hudWeaponName').textContent=name;$('hudWeaponCondition').textContent=weapon?'Состояние оружия':'Подготовь снаряжение';
 $('hudWeaponConditionValue').textContent=weapon?Math.round(condition)+'%':'—';
 $('hudWeaponConditionFill').style.width=weapon?condition+'%':'0%';
 $('hudWeaponSymbol').textContent=weapon?'▰':'—';
 hud.classList.toggle('hud-no-weapon',!weapon);
}

function weaponPower(item){return window.ZoneCombat.weaponPower(item);}
function startRandomEncounter(force=false){
 if(battle)return;
 const encounter=window.ZoneCombatEncounters.createRandomEncounter({risk:here().risk,xp:g.xp,force,random:Math.random});
 if(!encounter)return;
 battle={enemy:encounter.enemy,guard:encounter.guard,log:encounter.log,turn:encounter.turn};
 $('combatTitle').textContent='Контакт в секторе «'+here().name+'»';$('combatRisk').textContent=here().risk;
 $('combatOverlay').classList.add('show');combatLog('Контакт! '+encounter.description);renderCombat();
}
function startNpcEncounter(id){
 if(battle)return;const n=npcBy(id);if(!n||n.alive===false)return alert('Этот сталкер больше не представляет угрозы.');
 if((n.loc||n.location)!==g.loc)return alert('Противник должен находиться в текущем секторе.');
 if(!npcInCombatRange(n))return alert('Слишком далеко для начала боя. Подойди на расстояние 18 м.');
 if(!isHostileNpcFaction(n.faction))return alert('Этот сталкер не является твоим врагом.');
 if(zoneSocket?.connected)zoneSocket.emit('npc:combat:start',{npcId:id});
 const squadMembers=(activePlayerSquad?.members||[]).filter(m=>m.id!==zonePlayerId);const enemySquad=Object.values(serverWorld?.npcState||{}).filter(x=>x.alive&&x.location===n.location&&x.squadId&&x.squadId===n.squadId&&x.id!==n.id);
 battle=window.ZoneCombatEncounters.createNpcEncounter({npc:n,allies:squadMembers,enemySupport:enemySquad,random:Math.random});
 $('combatTitle').textContent='Бой со сталкером · '+here().name;$('combatRisk').textContent=n.faction;$('combatOverlay').classList.add('show');combatLog(`${n.name} (${n.faction}) открыл огонь. Контакт подтверждён.`);renderCombat();
}
function combatLog(text){window.ZoneCombatView.combatLog({battle,$,escapeHtml},text);}
function renderCombat(){window.ZoneCombatView.renderCombat({battle,g,$,equippedWeapon,weaponPower});}
function finishCombat(result){
 if(!battle)return;
 const outcome=window.ZoneCombatResults.resolveCombatOutcome({result,battle,random:Math.random});
 if(outcome.status==='ignored'||outcome.status==='await-server')return;
 if(outcome.status==='win'){
  g.money+=outcome.reward;g.xp+=outcome.xp;
  log(`Столкновение завершено: ${outcome.enemyName}. Награда ${outcome.reward} ₽ и ${outcome.xp} опыта.`);
  news(outcome.newsTitle,`${g.name} пережил встречу с угрозой в районе «${here().name}».`);
 }else if(outcome.status==='escape'){
  log(outcome.logMessage);g.stamina=Math.max(0,g.stamina-outcome.staminaCost);
 }else if(outcome.status==='defeat'){
  playerDeath(outcome.deathCause);return;
 }
 battle=null;$('combatOverlay').classList.remove('show');save();
}
function combatControllerContext(){return {battle,g,zoneSocket,zonePlayerReady,equippedWeapon,weaponPower,artifactEffect,combatLog,renderCombat,finishCombat,playerDeath,save,alert,random:Math.random};}
function enemyTurn(){return window.ZoneCombatController.enemyTurn(combatControllerContext());}
function combatAction(action){return window.ZoneCombatController.combatAction(combatControllerContext(),action);}


const originalFinishCombat=finishCombat;
finishCombat=function(result){if(result==='win'&&!battle?.npcId){g.careerStats||={};g.careerStats.kills=(g.careerStats.kills||0)+1;rankRecentEvents.unshift({name:g.name,text:'Победа в столкновении. Личный рейтинг обновлён.'});rankRecentEvents=rankRecentEvents.slice(0,12);if($('ranks')?.classList.contains('active'))renderStalkerLeaderboard();}return originalFinishCombat(result);};
const originalExplore=explore;
explore=function(){if(battle)return;originalExplore();if(!battle)setTimeout(()=>startRandomEncounter(false),80);};


// LIVING ZONE 4.2 — persistent local simulation layer.
function initLivingState(){window.ZoneLivingState.initialize(g,g.npcs);}
function livingNews(title,body){window.ZoneLivingState.appendNews(g,title,body,realClock());}
function livingRank(){return window.ZoneLivingWorld.rankForXp(g.xp||0);}
function renderLivingZone(){
 if(!$("livingStats"))return; initLivingState();
 $("livingStats").innerHTML=[["Сектор",here().name],["Активные контракты",g.contracts.filter(c=>c.accepted&&!c.done).length],["События лагеря",g.campFeed.length],["Состояние Зоны",serverWorld?.emission?.label|| (g.emission?.active?"Выброс":g.emission?.warning?"Предупреждение":"Спокойно")]].map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 $("npcRelations").innerHTML=g.npcs.slice(0,18).map(n=>{let v=g.relationships[n.id]||0;return `<div class="item"><div><b>${escapeHtml(n.icon||"◉")} ${escapeHtml(n.name)}</b><div class="desc">${escapeHtml(n.role)} · отношение ${v>0?"+":""}${v}</div></div><button onclick="livingTalk('${n.id}')">Совместный привал · 50 ₽</button></div>`}).join("");
 $("factionRank").innerHTML=`<b>${escapeHtml(g.faction)} · ${livingRank()}</b><div class="desc">Опыт: ${g.xp} · Репутация: ${g.rep}. Следующий ранг открывается с ростом опыта и выполнением поручений.</div>`;
 $("contracts").innerHTML=g.contracts.map(c=>`<div class="item block"><b>${escapeHtml(c.title)}</b><div class="desc">${escapeHtml(c.desc)} · ${c.reward} ₽ / ${c.xp} XP</div><span class="tag">${c.done?"Выполнен":c.accepted?"В работе":"Доступен"}</span><div class="rightbuttons">${!c.accepted&&!c.done?`<button onclick="livingAccept('${c.id}')">Взять контракт</button>`:""}${c.accepted&&!c.done?`<button onclick="livingComplete('${c.id}')">Сдать контракт</button>`:""}</div></div>`).join("");
 $("patrols").innerHTML=g.patrols.slice(0,8).map(p=>`<div class="item"><span>🪖 ${escapeHtml(p.faction)} · ${escapeHtml(g.locations.find(l=>l.id===p.loc)?.name||p.loc)}</span><b>${p.strength} бойцов</b></div>`).join("")||'<div class="mutedbox small">Патрули пока не отмечены. Проверь обстановку.</div>';
 $("patrols").innerHTML += g.locations.map(l=>`<div class="item"><span>${escapeHtml(l.name)} · ${escapeHtml(l.owner)} · ${l.control}%</span>${l.owner!==g.faction?`<button onclick="livingTerritory('${l.id}')">Влияние · 350 ₽</button>`:""}</div>`).join("");
 const eco=serverWorld?.ecosystem;
 const ecosystemView=window.ZoneLivingEcosystemView.prepare(eco,g.loc,g.faction);
 const {packs,bases,clans}=ecosystemView;
 $("campFeed").innerHTML=g.campFeed.slice(0,6).map(e=>`<div class="item"><b>${escapeHtml(e.title)}</b><div class="desc">${escapeHtml(e.body)}</div></div>`).join("")||'<div class="mutedbox small">У костра пока тихо.</div>';
 $("campFeed").innerHTML += `<div class="section">Экосистема сектора</div><div class="item"><b>Мутанты поблизости: ${ecosystemView.mutantCount}</b><div class="desc">${packs.map(p=>`${escapeHtml(p.species)} ×${p.count}`).join(' · ')||'Следов мутантов поблизости не обнаружено.'}</div><div class="desc">Аномальных полей: ${ecosystemView.anomalyCount}</div></div><div class="section">Базы группировки</div>${bases.map(b=>`<div class="item"><b>${escapeHtml(locationName(b.location))} · уровень ${b.level}</b><div class="desc">Укрепления ${b.fortification}% · припасы ${b.supplies}%</div><button onclick="upgradeZoneBase('${b.location}')">Улучшить · 500 ₽</button></div>`).join('')||'<div class="mutedbox small">У группировки пока нет зарегистрированных баз.</div>'}<div class="section">Кланы</div><div class="item"><b>Кланов твоей группировки: ${clans.length}</b><div class="desc">${clans.map(c=>`${escapeHtml(c.name)} · ${c.members.length} участников`).join(' · ')||'Создай клан, чтобы собирать отряд.'}</div><button onclick="createZoneClan()">Создать клан</button></div>`;
 renderSurvival();
}
function upgradeZoneBase(location){if(!zoneSocket?.connected)return alert('Для улучшения базы нужно подключение к серверу.');zoneSocket.emit('base:upgrade',{location});}
function createZoneClan(){const name=prompt('Название клана (3–24 символа):');if(!name)return;if(!zoneSocket?.connected)return alert('Для создания клана нужно подключение к серверу.');zoneSocket.emit('clan:create',{name});}
function livingTalk(id){initLivingState();let n=npcBy(id);if(!n)return;if((n.loc||n.location)!==g.loc)return alert("Для совместного привала NPC должен находиться в твоём секторе.");g.relationshipCooldowns ||= {};const now=Date.now(),last=Number(g.relationshipCooldowns[id]||0);if(now-last<6*3600000)return alert("Вы уже проводили время вместе. Следующая встреча возможна через несколько часов.");if(g.money<50)return alert("Нужно 50 ₽ на общий привал и припасы.");g.money-=50;g.relationshipCooldowns[id]=now;g.relationships[id]=Math.min(100,(g.relationships[id]||0)+1);livingNews("Совместный привал: "+n.name,`Вы поделились припасами и поговорили у костра. Отношение изменилось незначительно: ${g.relationships[id]}.`);log("Совместный привал с "+n.name+" обошёлся в 50 ₽.");save();}
function initSurvival(){g.survival ||= {lastTickAt:Date.now(),events:[],kit:null,lastHuntAt:0,shelterUntil:0};g.survival.events ||= [];g.survival.lastTickAt ||= Date.now();}
function survivalEvent(text,danger=false){initSurvival();g.survival.events.unshift({text:String(text).slice(0,220),at:Date.now(),danger:!!danger});g.survival.events=g.survival.events.slice(0,8);}
function tickSurvival(){initSurvival();const now=Date.now(),elapsed=Math.max(0,Math.min(180*60000,now-g.survival.lastTickAt));if(elapsed<60000)return;const result=window.ZoneSurvival.advanceNeeds(g,elapsed,g.atmosphereState?.weather||'overcast');g.radiation=Math.min(100,radiationLevel()+artifactEffect('radiation')*(elapsed/60000));g.survival.lastTickAt=now;if(g.emission?.active&&!zoneSocket?.connected&&now-Number(g.survival.lastEmissionDamageAt||0)>=60000){const suit=(g.items||[]).find(x=>x.name===g.equipment?.suit&&x.type==='Броня'),protection=Number(suit?.defense||0)*5+artifactEffect('radiationProtection')*100,damage=window.ZoneSurvival.emissionDamage(g.survival.shelterUntil>now,protection);g.hp=Math.max(1,g.hp-damage.hp);g.radiation=Math.min(100,radiationLevel()+Math.max(0,damage.radiation-artifactEffect('radiationProtection')*12));g.stamina=Math.max(0,g.stamina-damage.stamina);g.survival.lastEmissionDamageAt=now;if(damage.hp)survivalEvent('Выброс накрыл сектор: здоровье, выносливость и защита от радиации под угрозой.',true);}if(g.thirst>=85)survivalEvent('Сильная жажда снижает выносливость. Найди воду.',true);if(g.hunger>=85)survivalEvent('Запасы энергии на исходе. Нужно поесть.',true);if(result.damage){survivalEvent('Истощение нанесло урон здоровью: '+result.damage+'.',true);log('Здоровье ухудшилось из-за голода или жажды.');}save();}
function renderSurvival(){initSurvival();const el=$('survivalVitals');if(!el)return;const rows=[['Голод',g.hunger||0],['Жажда',g.thirst||0],['Выносливость',g.stamina||0],['Радиация',radiationLevel()]];el.innerHTML=rows.map(([n,v])=>`<div class="stat"><span>${n}</span><strong>${Math.round(v)}%</strong><div class="survival-meter ${v>=80?'warning':''}"><i style="width:${Math.max(0,Math.min(100,v))}%"></i></div></div>`).join('');const suit=(g.items||[]).find(x=>x.name===g.equipment?.suit&&x.type==='Броня');const report=$('survivalReport');if(report){const art=equippedArtifact();report.textContent=`Защита костюма: ${suit?.condition??100}% · ${art?`артефакт «${art.name}» активен`:'артефакт не экипирован'} · ${g.survival.shelterUntil>Date.now()?'Ты находишься в укрытии.':'Ты вне укрытия.'}`;}const kit=$('expeditionKitStatus');if(kit)kit.textContent=g.survival.kit?'Рюкзак собран: 1 паёк и 1 бутылка воды.':'Рюкзак не подготовлен. Нужны сухой паёк и вода.';const events=$('survivalEvents');if(events)events.innerHTML=g.survival.events.slice(0,5).map(e=>`<div class="survival-event ${e.danger?'danger':''}"><small>${new Date(e.at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</small> ${escapeHtml(e.text)}</div>`).join('')||'<div class="mutedbox small">Пока без происшествий.</div>';}
function prepareExpedition(){initSurvival();if(g.survival.kit)return alert('Рюкзак уже подготовлен.');if(!count('ration')||!count('water'))return alert('Нужны 1 сухой паёк и 1 бутылка воды.');take('ration',1);take('water',1);g.survival.kit={rations:1,water:1,preparedAt:Date.now()};survivalEvent('Ты уложил сухой паёк и воду в экспедиционный рюкзак.');log('Экспедиционный рюкзак подготовлен.');save();renderInventory();}
function survivalCamp(){initSurvival();if(zoneSocket?.connected&&zonePlayerReady){zoneSocket.emit('player:survival:camp');return;}if(g.survival.shelterUntil>Date.now())return alert('Ты уже отдыхаешь в укрытии.');if(!take('tea',1)&&!take('water',1))return alert('Для привала нужен термос чая или бутылка воды.');g.stamina=Math.min(100,(g.stamina||0)+28);g.hunger=Math.max(0,(g.hunger||0)-7);g.thirst=Math.max(0,(g.thirst||0)-16);g.survival.shelterUntil=Date.now()+5*60000;survivalEvent('Полевой привал: ты восстановил силы и укрылся на пять минут.');log('Полевой привал помог восстановить силы.');save();renderInventory();}
function survivalShelter(){initSurvival();const safe=['cordon','bar','yantar','swamps','army'].includes(g.loc);if(!safe&&Math.random()<.65)return alert('Укрытие не найдено. Осмотри сектор или вернись к базе.');g.survival.shelterUntil=Date.now()+10*60000;survivalEvent('Найдено укрытие. На десять минут ты защищён от открытого воздействия выброса.');livingNews('Укрытие найдено','Ты занял защищённую позицию в секторе '+here().name+'.');save();}
function huntMutants(){initSurvival();if(Date.now()-g.survival.lastHuntAt<60000)return alert('После последней охоты нужно восстановиться. Подожди минуту.');const eco=ecologyData(),pack=(eco.mutantPacks||[]).find(x=>x.location===g.loc&&x.count>0);if(!pack)return alert('В этом секторе не обнаружено доступных групп мутантов. Проведи осмотр местности.');const weapon=String(g.equipment?.weapon||'');if(!weapon)return alert('Нужно экипировать оружие.');if(g.stamina<18)return alert('Для охоты нужно минимум 18 выносливости.');if(zoneSocket?.connected&&zonePlayerReady){zoneSocket.emit('survival:hunt',{packId:pack.id});return;}const result=window.ZoneSurvival.resolveHunt(pack,/АК|винтов|руж|СВД|Гроза/i.test(weapon)?75:45,g.stamina,Math.random());g.survival.lastHuntAt=Date.now();g.stamina=Math.max(0,g.stamina-18);if(result.ok){pack.count=Math.max(0,pack.count-1);addItem('mutant_trophy','Трофей мутанта','Материал','Добыча после охоты на мутанта.',.8,110);g.xp+=18;g.money+=35;survivalEvent(`Охота успешна: ${pack.species}. Получен трофей, +18 опыта и 35 ₽.`);log(`Охота на ${pack.species} завершилась успешно.`);}else{g.hp=Math.max(1,g.hp-result.damage);survivalEvent(result.reason+' Потеряно здоровья: '+result.damage+'.',true);log('Мутанты отбросили тебя.');}save();renderInventory();renderLivingZone();if($('world')?.classList.contains('active'))renderZoneMap();}
function consumeExpeditionSupplies(risk){initSurvival();const kit=g.survival.kit,cost=window.ZoneSurvival.expeditionCost(risk,g.atmosphereState?.weather||'clear',!!g.emission?.active);if(kit?.rations&&kit?.water){g.hunger=Math.max(0,g.hunger-8);g.thirst=Math.max(0,g.thirst-18);g.survival.kit=null;}else{cost.stamina+=8;cost.hunger+=5;cost.thirst+=7;survivalEvent('Ты отправился без полноценного запаса припасов. Переход оказался тяжелее.',true);}g.stamina=Math.max(0,g.stamina-cost.stamina*(1-Math.min(.25,artifactEffect('staminaDrain'))));g.hunger=Math.min(100,g.hunger+cost.hunger);g.thirst=Math.min(100,g.thirst+cost.thirst);g.radiation=Math.min(100,radiationLevel()+cost.radiation);if(g.stamina<=0){g.hp=Math.max(1,g.hp-4);survivalEvent('Переход истощил тебя. Получено 4 урона.',true);}}
function localEcology(){return window.ZoneLocalEcology.createFallback();}
function ecologyData(){if(zoneSocket?.connected&&serverWorld?.ecosystem)return serverWorld.ecosystem;g.localEcology ||= (serverWorld?.ecosystem?clone(serverWorld.ecosystem):localEcology());const eco=g.localEcology;eco.anomalies ||= [];const extras=[['cordon','Газировка'],['dump','Мясорубка'],['yantar','Пепелище'],['red','Комета'],['pripyat','Пси-поле'],['swamps','Кисель'],['jupiter','Электра'],['dark','Воронка']];for(let i=0;i<extras.length;i++){const id='local_anomaly_extra_'+(i+1);if(!eco.anomalies.some(a=>a.id===id))eco.anomalies.push({id,location:extras[i][0],kind:extras[i][1],danger:42+(i*9)%48});}return eco;}

let fieldSurveyTimer=null;


function initFieldwork(){g.fieldNotes ||= [];g.fieldSurvey ||= null;g.artifactSearchAt ||= 0;initSurvival();}
function renderFieldwork(){initFieldwork();const notes=$('fieldNotes');if(notes)notes.innerHTML=g.fieldNotes.slice(0,12).map(n=>`<div class="item block"><b>${escapeHtml(n.place)} · ${escapeHtml(n.time)}</b><div class="desc">${escapeHtml(n.text)}</div></div>`).join('')||'<div class="mutedbox small">Записей пока нет.</div>';const status=$('surveyStatus');if(status){const s=g.fieldSurvey;if(s&&s.location!==g.loc){g.fieldSurvey=null;if(fieldSurveyTimer){clearInterval(fieldSurveyTimer);fieldSurveyTimer=null;}status.textContent='Осмотр прерван: ты покинул сектор до завершения.';livingNews('Разведка прервана','Ты покинул сектор до окончания осмотра. Собранные данные не засчитаны.');save();}else if(s&&s.endsAt>Date.now()){const left=Math.ceil((s.endsAt-Date.now())/1000);status.textContent=`Осмотр сектора продолжается: ${left} сек. Осталось.`;if(!fieldSurveyTimer)fieldSurveyTimer=setInterval(()=>{renderFieldwork();if(!g.fieldSurvey||g.fieldSurvey.endsAt<=Date.now()){clearInterval(fieldSurveyTimer);fieldSurveyTimer=null;finishAreaSurvey();}},1000);}else if(s&&s.endsAt<=Date.now()){status.textContent='Осмотр завершён. Обрабатываем наблюдения…';finishAreaSurvey();}else status.textContent='Разведка не проводится.';}}
function startAreaSurvey(){initFieldwork();if(g.fieldSurvey&&g.fieldSurvey.endsAt>Date.now())return alert('Осмотр уже проводится.');if(g.stamina<12)return alert('Нужно минимум 12 выносливости для разведки.');g.stamina-=12;g.fieldSurvey={location:g.loc,startedAt:Date.now(),endsAt:Date.now()+60000};livingNews('Начат осмотр местности',`Ты начал 60-секундную разведку сектора «${here().name}». Не покидай сектор до завершения.`);if($('fieldworkStatus'))$('fieldworkStatus').textContent='Разведка началась. Не покидай сектор; результаты появятся через 60 секунд.';save();renderFieldwork();}
function finishAreaSurvey(){initFieldwork();const s=g.fieldSurvey;if(!s||s.endsAt>Date.now())return;g.fieldSurvey=null;const points=g.keyPoints?.[s.location]||[],unknown=points.filter(p=>!p.discovered);let report=[];if(unknown.length){report=window.ZoneFieldwork.discoverPoints(unknown,2,Math.random);}const ecology=ecologyData(),packs=(ecology.mutantPacks||[]).filter(p=>p.location===s.location),anomalies=(ecology.anomalies||[]).filter(a=>a.location===s.location);const body=`Разведка завершена. ${report.length?`Обнаружены точки: ${report.join(', ')}.`:'Новых ориентиров не найдено.'} Следы мутантов: ${packs.reduce((n,p)=>n+p.count,0)}. Аномальных сигналов: ${anomalies.length}.`;g.fieldSurveyReport={location:s.location,at:Date.now(),points:report,mutants:packs.length,anomalies:anomalies.length};g.xp+=18;livingNews('Отчёт разведки',body);if($('fieldworkStatus'))$('fieldworkStatus').textContent=body;log(body);zoneMapDirty=true;save();renderKeyPoints();renderFieldwork();if($('world')?.classList.contains('active'))renderZoneMap();}
function renderCoopArtifactExpeditions(list){serverWorld=serverWorld||{};serverWorld.artifactExpeditions=list||[];const host=$('coopArtifactExpeditions');if(!host)return;const active=(list||[]).filter(e=>e.status==='searching'||e.status==='ready');host.innerHTML=active.map(e=>{const joined=(e.participants||[]).some(p=>p.id===zonePlayerId);const full=(e.participants||[]).length>=4;return `<article class="item block coop-artifact-card"><b>Сигнал: ${escapeHtml(e.artifactName||'неизвестный артефакт')}</b><div class="desc">${escapeHtml(locationName(e.location))} · ${e.participants?.length||0}/4 участников · ${e.status==='ready'?'сигнал найден':'поиск группы'}</div><div class="small muted">Командир: ${escapeHtml(e.leaderName||'сталкер')} · ${new Date(e.createdAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</div><div class="rightbuttons">${joined?`<button type="button" onclick="claimCoopArtifactExpedition('${e.id}')" ${e.status!=='ready'?'disabled':''}>Забрать находку группе</button>`:`<button type="button" onclick="joinCoopArtifactExpedition('${e.id}')" ${full||e.location!==g.loc?'disabled':''}>Присоединиться</button>`}</div></article>`}).join('')||'<div class="mutedbox small">В твоём секторе нет активных совместных поисков.</div>';}
function refreshCoopArtifactExpeditions(){if(zoneSocket?.connected)zoneSocket.emit('artifact-expedition:state');else if($('coopArtifactExpeditions'))$('coopArtifactExpeditions').innerHTML='<div class="mutedbox small">Совместные экспедиции доступны при подключении к серверу.</div>';}
function createCoopArtifactExpedition(){if(!zoneSocket?.connected)return alert('Для совместной экспедиции подключись к серверу.');zoneSocket.emit('artifact-expedition:create',{location:g.loc});setTimeout(()=>refreshCoopArtifactExpeditions(),47000);}
function joinCoopArtifactExpedition(id){if(!zoneSocket?.connected)return;zoneSocket.emit('artifact-expedition:join',{id});}
function claimCoopArtifactExpedition(id){if(!zoneSocket?.connected)return;zoneSocket.emit('artifact-expedition:claim',{id});}
function searchArtifacts(){initFieldwork();const detector=(g.items||[]).find(x=>x.type==='Детектор'&&x.name===g.equipment?.tool&&x.qty>0)||(g.items||[]).find(x=>x.type==='Детектор'&&x.qty>0);if(!detector)return alert('Для поиска нужен детектор. Купи его и экипируй в инвентаре.');if(g.stamina<10)return alert('Недостаточно выносливости: требуется 10.');if(Date.now()-Number(g.artifactSearchAt||0)<20000)return alert('Детектор перегревается. Подожди 20 секунд между сканированиями.');g.stamina-=10;g.artifactSearchAt=Date.now();const sites=ensureArtifactSites(),existing=sites.find(x=>x.location===g.loc&&!x.collected);const tier=Number(detector.tier||1),anomalies=(ecologyData().anomalies||[]).filter(a=>a.location===g.loc);let msg;if(existing){existing.discovered=true;msg=`Детектор повторно поймал сигнал в этом секторе. Координаты отмечены на карте.`;}else{const chance=window.ZoneFieldwork.artifactDiscoveryChance({anomalyCount:anomalies.length,tier,condition:detector.condition});if(Math.random()<chance){const pool=window.ZoneFieldwork.eligibleArtifacts(Object.values(artifactDefinitions),tier);const def=pool[Math.floor(Math.random()*pool.length)];const pos=artifactPosition(g.loc);const site={id:`artifact-site-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,location:g.loc,x:pos.x,y:pos.y,artifactId:def.id,rarity:def.rarity,discovered:true,collected:false,createdAt:Date.now()};sites.push(site);g.artifactSites=sites.slice(-80);msg=`Обнаружен устойчивый сигнал: ${def.rarity} сигнатура. Место находки отмечено на карте. Подойди к отметке, чтобы забрать артефакт.`;g.xp+=8;}else msg='Сканер зафиксировал аномальный фон, но устойчивой сигнатуры не обнаружил. Попробуй другой участок или более точный детектор.';}livingNews('Сканирование артефактов',msg);log(msg);if($('fieldworkStatus'))$('fieldworkStatus').textContent=msg;zoneMapDirty=true;save();renderFieldwork();if($('world')?.classList.contains('active'))renderZoneMap();}
function addFieldNote(){initFieldwork();const input=$('fieldNoteInput'),text=String(input?.value||'').trim();if(!text)return alert('Сначала напиши заметку.');const clock=realClock();g.fieldNotes.unshift({id:'note_'+Date.now(),location:g.loc,place:here().name,time:clock.time,text:text.slice(0,600),at:Date.now()});g.fieldNotes=g.fieldNotes.slice(0,100);if(input)input.value='';livingNews('Запись в личном блокноте',`Ты записал наблюдение о секторе «${here().name}».`);save();renderFieldwork();}
function livingAccept(id){let c=g.contracts.find(x=>x.id===id);if(!c||c.done)return;if(zoneSocket?.connected&&zonePlayerReady){zoneSocket.emit('player:contract:accept',{contractId:id});return;}c.accepted=true;livingNews("Контракт принят",c.title+" · заказчик: "+c.giver);save();}
function livingComplete(id){let c=g.contracts.find(x=>x.id===id);if(!c||!c.accepted||c.done)return;if(zoneSocket?.connected&&zonePlayerReady){zoneSocket.emit('player:contract:complete',{contractId:id});return;}if(g.loc!==c.loc)return alert("Для сдачи контракта вернись в сектор: "+(g.locations.find(l=>l.id===c.loc)?.name||c.loc));if(c.item&&count(c.item)<c.qty)return alert("Не хватает предметов: "+c.item+" ×"+c.qty);if(c.item)take(c.item,c.qty);c.done=true;g.money+=c.reward;g.xp+=c.xp;g.rep+=c.rep;livingNews("Контракт выполнен",`${c.title}. Получено ${c.reward} ₽ и ${c.xp} опыта.`);save();}
function livingCamp(){initLivingState();g.stamina=Math.min(100,g.stamina+16);let nearby=nearbyNpcs(),n=nearby[Math.floor(Math.random()*Math.max(1,nearby.length))];let body=window.ZoneLivingWorld.campStory(Math.random);if(n){g.relationships[n.id]=Math.min(100,(g.relationships[n.id]||0)+2);body+=` ${n.name} стал относиться к тебе немного теплее.`;}livingNews("Вечер у костра",body);save();}
function livingRumor(){livingNews("Слух КПК",window.ZoneLivingWorld.rumor(Math.random));g.rep+=1;save();}
function livingPatrol(){initLivingState();const patrol=window.ZoneLivingWorld.createPatrol(g.factions,g.locations,Math.random,Date.now());if(!patrol)return;g.patrols.unshift(patrol);g.patrols=g.patrols.slice(0,12);livingNews("Обновление патрулей",`Разведка заметила отряд группировки «${patrol.faction}» в секторе ${g.locations.find(l=>l.id===patrol.loc).name}.`);save();}
function livingEmissionShelter(){initLivingState();initSurvival();if(!g.emission.active&&!g.emission.warning)return alert("Сейчас выброса нет. По КПК поступают обычные фоновые сигналы.");g.survival.shelterUntil=Date.now()+10*60000;g.emission.warning=false;if(g.emission.active){const suit=(g.items||[]).find(x=>x.name===g.equipment?.suit&&x.type==='Броня'),damage=window.ZoneSurvival.emissionDamage(true,Number(suit?.defense||0)*5);g.emission.active=false;g.survival.lastEmissionDamageAt=Date.now();livingNews("Пережитый выброс","Ты успел укрыться. Укрытие погасило основной удар, но сектор остаётся опасным.");}else livingNews("Укрытие подготовлено","Ты нашёл укрытие до начала выброса. Следующая волна не застанет тебя на открытом месте.");survivalEvent('Ты укрылся от выброса на десять минут.');save();}
function livingTerritory(id){let l=g.locations.find(x=>x.id===id);const result=window.ZoneTerritoryOperations.evaluate(l,g.faction,g.money);if(result.status==="missing")return;if(result.status==="already-owned")return alert("Этот сектор уже под влиянием твоей группировки.");if(result.status==="insufficient-funds")return alert("Нужно 350 ₽ на снабжение операции.");g.money-=result.cost;l.control=result.control;if(result.status==="captured"){l.owner=g.faction;livingNews("Смена контроля",`${l.name}: влияние перешло от «${result.previousOwner}» к «${g.faction}».`);g.rep+=result.reputationGain;}else livingNews("Операция влияния",`${g.faction} укрепляет позиции в секторе ${l.name}. Контроль: ${l.control}%.`);save();}
function livingWorldTick(){initLivingState();initSurvival();g.worldTick++;if(!zoneSocket?.connected){if(g.emission.active){g.emission.active=false;g.emission.cooldownUntil=Date.now()+30*60000;livingNews("Выброс отступил","Основная волна прошла. Остаточный фон ещё опасен; проверь радиацию и состояние снаряжения.");}else if(g.emission.warning){if(Math.random()<.6){g.emission.warning=false;g.emission.active=true;const suit=(g.items||[]).find(x=>x.name===g.equipment?.suit&&x.type==='Броня'),damage=window.ZoneSurvival.emissionDamage(g.survival.shelterUntil>Date.now(),Number(suit?.defense||0)*5);g.hp=Math.max(1,g.hp-damage.hp);g.radiation=Math.min(100,radiationLevel()+damage.radiation);g.stamina=Math.max(0,g.stamina-damage.stamina);g.survival.lastEmissionDamageAt=Date.now();livingNews("Выброс","Волна накрыла сектор. Укрытие и защитный костюм смягчают последствия.");}}else if(Date.now()>=Number(g.emission.cooldownUntil||0)&&Math.random()<.16){g.emission.warning=true;livingNews("Предупреждение КПК: выброс","Зафиксирован рост радиационного фона. Найди укрытие и не задерживайся на открытой местности.");}}if(Math.random()<.22)livingPatrol();}
initLivingState();

function renderWar(){
 const ops=serverWorld?.warOperations||[],history=serverWorld?.warHistory||[],owners=serverWorld?.territoryOwners||{},points=Object.values(serverWorld?.keyPoints||{}),objectives=serverWorld?.factionObjectives||{},resources=serverWorld?.factionResources||{};
 if(serverWorld?.territoryOwners){for(const l of g.locations){if(owners[l.id])l.owner=owners[l.id];if(serverWorld.territoryControl?.[l.id]!==undefined)l.control=serverWorld.territoryControl[l.id];}renderMap();}
 const active=ops.filter(x=>x.status==='active');
 if($('warStats'))$('warStats').innerHTML=[["Активные операции",active.length],["Твоя сторона",g.faction],["Текущий сектор",here().name]].map(x=>`<div class="stat"><span>${escapeHtml(String(x[0]))}</span><strong style="font-size:15px">${escapeHtml(String(x[1]))}</strong></div>`).join('');
 const current=active.find(x=>x.location===g.loc);
 if($('warCurrent'))$('warCurrent').innerHTML=current?warOperationHtml(current):`<div class="mutedbox small">В секторе ${escapeHtml(here().name)} активной операции нет.</div>${(owners[g.loc]||here().owner)!==g.faction?`<div class="item"><span>Контроль сектора: ${escapeHtml(owners[g.loc]||here().owner)}</span><button onclick="warCreate()">Объявить штурм · 350 ₽</button></div>`:'<div class="mutedbox small">Сектор под контролем твоей группировки. Отдельные объекты могут принадлежать другим группировкам — смотри список ключевых точек ниже.</div>'}`;
 if($('warOperations'))$('warOperations').innerHTML=active.map(warOperationHtml).join('')||'<div class="mutedbox small">Активных операций нет. Фронт пока спокоен.</div>';
 if($('npcWarFeed')){const fronts=(serverWorld?.battlefronts||[]).slice(0,12),convoys=(serverWorld?.convoys||[]).slice(-8).reverse(),bases=(serverWorld?.factionBases||[]).filter(x=>x.total>0).slice(0,8);$('npcWarFeed').innerHTML=[...fronts.map(x=>({title:`${x.attacker} против ${x.defender}`,where:x.location,status:x.status==='active'?'Бой идёт':'Столкновение завершено',type:'⚔'})),...convoys.map(x=>({title:`Караван снабжения · ${x.faction}`,where:x.location,status:x.status==='ambushed'?'Попал в засаду':x.status==='arrived'?'Прибыл':'В пути',type:'▣'})),...bases.map(x=>({title:`База · ${x.faction}`,where:x.location,status:`${x.guards} охрана · ${x.campfire} у костра · ${x.patrols} патруль`,type:'⌂'}))].map(x=>`<div class="item"><div><b>${x.type} ${escapeHtml(x.title)}</b><div class="desc">${escapeHtml(g.locations.find(l=>l.id===x.where)?.name||x.where)} · ${escapeHtml(x.status)}</div></div></div>`).join('')||'<div class="mutedbox small">Боевые столкновения и караваны появятся после обновления мира.</div>';}
 if($('warCommandCouncil'))$('warCommandCouncil').innerHTML=Object.entries(serverWorld?.factionCommand||{}).map(([f,c])=>{const target=points.find(p=>p.id===c.targetPointId);const loc=g.locations.find(l=>l.id===c.headquarters);const label={guard:'Оборона',recon:'Разведка',supply:'Снабжение',patrol:'Патруль',capture:'Подготовка операции'}[c.directive]||'Дежурство';return `<div class="item"><div><b>${escapeHtml(f)} · ${escapeHtml(c.leaderName||'Штаб')}</b><div class="desc">Штаб: ${escapeHtml(loc?.name||c.headquarters||'—')} · приказ: ${label}</div><div class="desc">${escapeHtml(c.directiveText||'')} ${target?`· цель: ${escapeHtml(target.name)} (${escapeHtml(g.locations.find(l=>l.id===target.location)?.name||target.location)})`:''}</div></div><span class="tag">${Number(c.ordersIssued)||0} приказов</span></div>`}).join('')||'<div class="mutedbox small">Командование загружается с сервера.</div>';
 if($('warFactionObjective'))$('warFactionObjective').innerHTML=Object.entries(objectives).map(([f,o])=>{const r=resources[f]||{};const owned=points.filter(p=>p.owner===f).length;return `<div class="item"><div><b>${escapeHtml(f)} · ${escapeHtml(o.title||'Стратегия')}</b><div class="desc">${escapeHtml(o.description||'')} · объектов: ${owned}</div><div class="desc">Запасы: ${Number(r.supplies)||0} · материалы: ${Number(r.materials)||0} · разведданные: ${Number(r.intel)||0}</div></div><span class="tag">${escapeHtml(o.posture||'')}</span></div>`}).join('')||'<div class="mutedbox small">Стратегические цели загружаются с сервера.</div>';
 if($('warKeyPoints'))$('warKeyPoints').innerHTML=g.locations.map(l=>{const sector=points.filter(p=>p.location===l.id);return `<div class="item block"><b>${escapeHtml(l.name)}</b>${sector.map(p=>{const activePoint=ops.some(op=>op.pointId===p.id&&op.status==='active');const canAttack=p.owner!==g.faction&&p.location===g.loc&&!activePoint;return `<div class="item"><div><b>${escapeHtml(p.name)}</b><div class="desc">${escapeHtml(p.owner)} · ${escapeHtml(p.type)} · контроль ${Math.round(Number(p.control)||0)}%${Number(p.captureProgress)>0?` · давление ${Math.round(p.captureProgress)}%`:''}</div></div>${canAttack?`<button onclick="warCreate('${escapeHtml(p.id)}')">Операция · 350 ₽</button>`:activePoint?'<span class="tag">Операция идёт</span>':'<span class="tag">'+(p.owner===g.faction?'Под контролем':'Вне сектора')+'</span>'}</div>`}).join('')}</div>`}).join('')||'<div class="mutedbox small">Ключевые точки не получены.</div>';
 if($('warTerritories'))$('warTerritories').innerHTML=g.locations.map(l=>{let owner=owners[l.id]||l.owner;let control=serverWorld?.territoryControl?.[l.id]??l.control;const count=points.filter(p=>p.location===l.id&&p.owner===owner).length;return `<div class="item"><div><b>${escapeHtml(l.name)}</b><div class="desc">Владелец сектора: ${escapeHtml(owner)} · контроль ${control}% · объектов под контролем: ${count}/${points.filter(p=>p.location===l.id).length||10}</div></div><span class="tag">${owner===g.faction?'Свой сектор':'Чужая территория'}</span></div>`}).join('');
 if($('warHistory'))$('warHistory').innerHTML=[...(serverWorld?.factionWarHistory||[]).map(x=>({...x,attacker:x.to,defender:x.from,winner:x.to,captured:true})),...history].slice(0,18).map(x=>`<div class="item"><div><b>${escapeHtml(x.pointName||x.name||g.locations.find(l=>l.id===x.location)?.name||x.location)}</b><div class="desc">${escapeHtml(x.attacker||x.to||'')} против ${escapeHtml(x.defender||x.from||'')} · победитель: ${escapeHtml(x.winner||x.to||'')}</div></div><span class="tag">Захват / оборона</span></div>`).join('')||'<div class="mutedbox small">История сражений пока пуста.</div>';
}
function warOperationHtml(op){return window.ZoneWarView.operationHtml(op,{g,zonePlayerId,escapeHtml});}
function warCreate(pointId=null){if(!zoneSocket?.connected)return alert('Для военной операции нужно подключение к общей Зоне.');zoneSocket.emit('war:operation:create',{location:g.loc,pointId});}
function warDeploy(id,action){if(!zoneSocket?.connected)return alert('Нет связи с сервером.');zoneSocket.emit('war:operation:deploy',{operationId:id,action});}
function warResolve(id){if(!confirm('Завершить операцию и зафиксировать результат?'))return;zoneSocket.emit('war:operation:resolve',{operationId:id});}

function applyWorldSync(sync){
 if(!sync)return;
 if(sync.mode==='snapshot'&&sync.snapshot){serverWorld=sync.snapshot;}
 else if(sync.mode==='delta'&&Array.isArray(sync.events)){for(const ev of sync.events)handleOnlineWorldEvent(ev);}
 if(Number.isFinite(Number(sync.revision))){localStorage.setItem('zoneWorldRevision',String(sync.revision));}
 renderOnlineWorldStatus();
}
function handleOnlineWorldEvent(ev){
 const payload=ev.payload||{};
 if(ev.type==='player_joined'&&payload.player){const n=payload.player.name||'Сталкер';if($('onlineWorldFeed'))$('onlineWorldFeed').innerHTML=`<div class="item"><div><b>${escapeHtml(n)}</b><div class="desc">Подключился к общей Зоне</div></div><span class="tag">Онлайн</span></div>`+$('onlineWorldFeed').innerHTML;}
 else if(ev.type==='player_moved'||ev.type==='player_state_changed'){const name=payload.name||payload.player?.name||'Сталкер';const to=payload.to||payload.player?.location||'';if($('onlineWorldFeed'))$('onlineWorldFeed').innerHTML=`<div class="item"><div><b>${escapeHtml(name)}</b><div class="desc">Изменил положение${to?' · '+escapeHtml(to):''}</div></div><span class="tag">Мир</span></div>`+$('onlineWorldFeed').innerHTML;}
 else if(ev.type==='player_left'){if($('onlineWorldFeed'))$('onlineWorldFeed').innerHTML=`<div class="item"><div><b>${escapeHtml(payload.name||'Сталкер')}</b><div class="desc">Покинул общую Зону</div></div><span class="tag">Офлайн</span></div>`+$('onlineWorldFeed').innerHTML;}
 else if(ev.type==='zone_event'){const e=payload; if(e.title){g.news.unshift({day:realClock().day,hour:realClock().time,title:e.title,body:e.body||'Мировое событие'});g.news=g.news.slice(0,60);renderNews();}}
 if($('onlineWorldFeed')){const children=[...$('onlineWorldFeed').children];children.slice(25).forEach(x=>x.remove());}
}
function renderOnlineWorldStatus(status){
 const s=status||{};const revision=s.revision??Number(localStorage.getItem('zoneWorldRevision')||serverWorld?.revision||0);const npcCount=s.npcCount??Object.values(serverWorld?.npcState||{}).filter(n=>n?.alive).length;const wars=s.activeWars??(serverWorld?.warOperations||[]).filter(x=>x.status==='active').length;const sectors=s.sectors??Object.keys(serverWorld?.territoryOwners||{}).length;
 if($('onlineWorldStats'))$('onlineWorldStats').innerHTML=[["Игроки онлайн",s.online??onlinePlayers.length],["Живые NPC",npcCount],["Активные войны",wars],["Секторы",sectors],["Ревизия мира",revision]].map(([k,v])=>`<div class="stat"><span>${escapeHtml(String(k))}</span><strong>${escapeHtml(String(v))}</strong></div>`).join('');
 if($('worldRevisionLabel'))$('worldRevisionLabel').textContent=`Ревизия ${revision} · ${zoneSocket?.connected?'синхронизация активна':'нет соединения'}`;
}
function requestWorldResync(){if(zoneSocket?.connected)zoneSocket.emit('world:sync',{sinceRevision:Number(localStorage.getItem('zoneWorldRevision')||0)});}

function setOnlineConnectionState(state,message){
 const title=$("mpStatus"),detail=$("mpStatusText");
 if(title)title.textContent=state==="online"?"🟢 Подключено к общей Зоне":state==="connecting"?"🟡 Подключение к серверу…":"🔴 Нет соединения";
 if(detail)detail.textContent=message|| (state==="online"?"Сервер подтвердил вход. Игроки и мир синхронизированы.":state==="connecting"?"Устанавливаем связь и загружаем профиль…":"Сервер недоступен. Проверяем соединение и повторяем попытку.");
}
async function runNetworkCheck(){
 const output=$('mpDiagnosticsResult');if(output)output.textContent='Проверяем сервер и Socket.IO…';
 const isLocal=/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?)$/.test(String(window.location.hostname||''));
 let saved=(localStorage.getItem('zoneServerUrl')||'').trim();
 if(isLocal && /onrender\.com/i.test(saved)){localStorage.removeItem('zoneServerUrl');saved='';}
 const target=saved||(isLocal?window.location.origin:DEFAULT_ZONE_SERVER_URL);
 const checks=[];
 try{
  const healthResponse=await fetch(target.replace(/\/$/,'')+'/health',{cache:'no-store'});
  const health=await healthResponse.json();
  checks.push(`HTTP /health: ${healthResponse.ok&&health.ok?'OK':'ОШИБКА'} · версия ${health.version||'неизвестна'}`);
  const diagResponse=await fetch(target.replace(/\/$/,'')+'/api/diagnostics',{cache:'no-store'});
  const diag=await diagResponse.json();
  checks.push(`Мультиплеер: ${diag.multiplayer?'включён':'не подтверждён'} · игроков онлайн: ${diag.online??'—'}`);
  checks.push('Режим: гостевой вход без регистрации и пароля');
  checks.push(`Socket.IO: ${diag.socketPath||'/socket.io'} · ${Array.isArray(diag.transports)?diag.transports.join(' → '):'неизвестно'} · Node ${diag.node||'неизвестно'}`);
 }catch(error){checks.push(`HTTP /health: ОШИБКА · ${error.message||'сеть недоступна'}`);}
 checks.push(`Браузерный Socket.IO: ${typeof io==='function'?'загружен':'не загружен'}`);
 checks.push(`Адрес подключения: ${target}`);
 checks.push(`Текущее соединение: ${zoneSocket?.connected?'подключено':'не подключено'}`);
 if(output)output.textContent=checks.join(' | ');
 return checks;
}

const IS_LOCAL_ZONE_HOST=/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?)$/.test(String(window.location.hostname||''));
const DEFAULT_ZONE_SERVER_URL=IS_LOCAL_ZONE_HOST?window.location.origin:'https://zone-online-multiplayer.onrender.com';
async function waitForMultiplayerHealth(targetUrl, connectAttempt, maxWaitMs=1800){
 const startedAt=Date.now();let lastError='сервер ещё запускается';let attempts=0;
 while(Date.now()-startedAt<maxWaitMs){
  if(connectAttempt!==zoneConnectAttempt)return {cancelled:true};
  attempts++;const controller=new AbortController();const requestTimer=setTimeout(()=>controller.abort(),1200);
  try{
   const response=await fetch(`${targetUrl.replace(/\/$/,'')}/health?probe=${Date.now()}`,{cache:'no-store',mode:'cors',signal:controller.signal});
   if(response.ok){const data=await response.json();if(data?.ok){console.info('ZONE ONLINE: health check passed before Socket.IO',{version:data.version,elapsedMs:Date.now()-startedAt,attempts});return {ok:true,data};}lastError='сервер ответил без признака готовности';}
   else lastError=`HTTP ${response.status}`;
  }catch(error){lastError=error?.name==='AbortError'?'тайм-аут запуска сервера':(error?.message||'сервер пока недоступен');}
  finally{clearTimeout(requestTimer);}
  const elapsed=Math.floor((Date.now()-startedAt)/1000);
  setOnlineConnectionState('connecting',`Ожидаем запуск сервера… ${elapsed} сек. (${lastError}). Адрес сохранён, подключение начнётся сразу после ответа сервера.`);
  if(Date.now()-startedAt<maxWaitMs)await new Promise(resolve=>setTimeout(resolve,250));
 }
 console.warn('ZONE ONLINE: health preflight limit reached; trying Socket.IO anyway',{targetUrl,elapsedMs:Date.now()-startedAt,lastError});
 return {ok:false,error:lastError};
}
async function connectZone(){
 const connectAttempt=++zoneConnectAttempt;
 if(IS_LOCAL_ZONE_HOST){const saved=(localStorage.getItem('zoneServerUrl')||'').trim();if(/onrender\.com/i.test(saved))localStorage.removeItem('zoneServerUrl');}
 const queryMatch=String(window.location.search||'').match(/[?&]server=([^&]+)/);let queryServer=null;try{queryServer=queryMatch?decodeURIComponent(queryMatch[1].replace(/\+/g,' ')):null;}catch(error){console.warn('Invalid server URL query parameter:',error.message);}if(queryServer&&!localStorage.getItem('zoneServerUrl')){try{const u=new URL(queryServer);if(['http:','https:'].includes(u.protocol))localStorage.setItem('zoneServerUrl',u.origin);}catch{}}
 let clientReady = typeof io==='function';
 if(!clientReady){
  try{clientReady=window.zoneSocketClientReady?await window.zoneSocketClientReady:(typeof io==='function');}
  catch(error){console.warn('Socket.IO loader failed:',error);clientReady=false;}
 }
 if(connectAttempt!==zoneConnectAttempt)return;
 if(!clientReady || typeof io!=='function'){
  setOnlineConnectionState('connecting','Socket.IO пока не загрузился. Повторяем загрузку автоматически через 3 секунды…');
  if(typeof window.loadZoneSocketClient==='function'){
   window.zoneSocketClientReady=window.loadZoneSocketClient();
   setTimeout(()=>{if(connectAttempt===zoneConnectAttempt)connectZone();},3000);
  }else{
   setOnlineConnectionState('offline','Загрузчик Socket.IO не найден. Обнови страницу или проверь подключение скриптов в index.html.');
  }
  return;
 }
 const sameOrigin=window.location.origin;
 let serverUrl=(localStorage.getItem('zoneServerUrl')||DEFAULT_ZONE_SERVER_URL).trim();
 try{serverUrl=window.ZoneNetwork.normalizeServerUrl(serverUrl,DEFAULT_ZONE_SERVER_URL);}
 catch(error){console.warn('Discarding invalid saved multiplayer server URL:',error.message);serverUrl=window.ZoneNetwork.normalizeServerUrl(DEFAULT_ZONE_SERVER_URL);localStorage.setItem('zoneServerUrl',serverUrl);}
 // Do not start Engine.IO retries against a sleeping Render instance. Poll its
 // lightweight health endpoint first; this wakes Free services and starts Socket.IO
 // only after Express is listening. If CORS/network blocks the probe, fall back
 // to Socket.IO after a bounded wait instead of trapping the player here forever.
 const targetUrl=serverUrl||sameOrigin;
 // A second tap must not interrupt a healthy socket or an existing reconnect loop.
 if(window.ZoneNetwork.canReuse(zoneSocket,zoneSocketTarget,targetUrl)){
  console.info('ZONE ONLINE: keeping existing Socket.IO connection', {connected:zoneSocket.connected, active:zoneSocket.active, target:targetUrl});
  return;
 }
 setOnlineConnectionState('connecting','Проверяем доступность сервера и ожидаем его запуска…');
 await waitForMultiplayerHealth(targetUrl,connectAttempt,1800);
 if(connectAttempt!==zoneConnectAttempt)return;
 zonePlayerReady=false;
 window.ZoneNetwork.dispose(zoneSocket);
 zoneSocketTarget=targetUrl;
 if(serverUrl && serverUrl!==sameOrigin){
  console.info('Using configured multiplayer server:',serverUrl);
 }
 if($('mpServerUrl') && $('mpServerUrl').value!==serverUrl)$('mpServerUrl').value=serverUrl;
 try{
  // Prefer WebSocket, but allow Socket.IO to fall back to HTTP polling when a
  // proxy or client network blocks WebSocket upgrades.
  zoneSocket=window.ZoneNetwork.create(io,serverUrl);
 zoneSocket.on('connect',()=>{console.info('ZONE ONLINE: Socket.IO connected; sending player:hello', {at:new Date().toISOString(),socketId:zoneSocket.id, transport:zoneSocket.io.engine?.transport?.name, playerId:zonePlayerId||'(new guest)'});setOnlineConnectionState('connecting','Связь установлена. Сервер принял соединение, загружаем профиль…');const lastRevision=Number(localStorage.getItem('zoneWorldRevision')||0);zoneSocket.timeout(15000).emit('player:hello',{id:zonePlayerId,state:g,lastRevision,guest:true,sessionToken:localStorage.getItem('zoneGuestSessionToken')||''},(err,result)=>{if(err){setOnlineConnectionState('offline','Сервер установил соединение, но не подтвердил запрос входа. Проверь журналы Render и попробуй переподключиться.');console.error('ZONE ONLINE: player:hello acknowledgement timeout',err);return;}console.info('ZONE ONLINE: player:hello acknowledgement',result);if(!result?.ok){setOnlineConnectionState('offline',result?.message||'Сервер отклонил вход.');return;}if(result.sessionToken)localStorage.setItem('zoneGuestSessionToken',result.sessionToken);setOnlineConnectionState('connecting','Сервер подтвердил вход. Загружаем профиль и состояние Зоны…');if(zoneHelloReadyTimer)clearTimeout(zoneHelloReadyTimer);zoneHelloReadyTimer=setTimeout(()=>{if(zoneSocket?.connected)setOnlineConnectionState('offline','Сервер подтвердил вход, но не прислал профиль мира. Проверь ошибки player:hello в Render Logs.');},20000);});});
 zoneSocket.on('connect',()=>{
  const engine=zoneSocket?.io?.engine;
  if(engine&&!engine.__zoneCloseLogged){engine.__zoneCloseLogged=true;engine.on('close',reason=>console.warn('ZONE ONLINE: Engine.IO transport closed',reason));}
 });
 zoneSocket.on('connect_error',err=>{const target=(localStorage.getItem('zoneServerUrl')||window.location.origin).trim();const reason=err?.message||'ошибка сети';const extra=/timeout|websocket|transport/i.test(reason)?' Render может перезапустить экземпляр или оборвать сеть. Адрес сохранён; клиент продолжит автоматические попытки с увеличивающейся задержкой. Проверь /health и журналы Render.':' Проверь /health, адрес сервера и журналы Render.';setOnlineConnectionState('connecting',`Нет связи с ${target}. Причина: ${reason}. Клиент продолжит автоматические попытки. Проверка: ${extra}`);console.error('ZONE ONLINE Socket.IO connect_error:',err);});
 zoneSocket.on('disconnect',(reason,details)=>{console.warn('ZONE ONLINE socket disconnected:',reason,details?.message||'',details?.description||'',{active:zoneSocket?.active,connected:zoneSocket?.connected,target:zoneSocketTarget});zonePlayerReady=false;if(zoneHelloReadyTimer){clearTimeout(zoneHelloReadyTimer);zoneHelloReadyTimer=null;}if(reason!=='io client disconnect')setOnlineConnectionState('offline',`Соединение с сервером потеряно (${reason||'неизвестная причина'}). Клиент автоматически попробует подключиться снова.`);renderOnlinePlayers();renderOnlineWorldStatus();});
 zoneSocket.io.on('reconnect_attempt',()=>setOnlineConnectionState('connecting','Повторное подключение к серверу…'));
 zoneSocket.on('player:hello:error',data=>setOnlineConnectionState('offline',data?.message||'Не удалось завершить вход.'));
 zoneSocket.on('server:error',e=>{console.warn(e.message);setOnlineConnectionState('offline',e?.message||'Ошибка сервера.');});
 zoneSocket.on('player:contract:result',data=>{if(!data?.ok||!data.state){if(data?.message)log(data.message);return;}for(const key of ['contracts','items','money','xp','rep'])if(Object.prototype.hasOwnProperty.call(data.state,key))g[key]=data.state[key];window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);if(data.message)log(data.message);render();});
 zoneSocket.on('player:progression:result',data=>{if(!data?.state)return;for(const key of ['xp','careerStats','stamina'])if(Object.prototype.hasOwnProperty.call(data.state,key))g[key]=data.state[key];window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);if(data.message)log(data.message);render();});
 zoneSocket.on('player:survival:result',data=>{if(!data?.ok||!data.state){if(data?.message)log(data.message);return;}for(const key of ['items','hp','stamina','hunger','thirst','radiation','radiationProtectionUntil','serverShelterUntil','survival','survivalServerAt'])if(Object.prototype.hasOwnProperty.call(data.state,key))g[key]=data.state[key];if(g.survival)g.survival.shelterUntil=g.serverShelterUntil||0;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);if(data.message)log(data.message);render();renderInventory();});
 zoneSocket.on('player:quest:result',data=>{if(!data?.ok||!data.state){if(data?.message)log(data.message);return;}const keys=['money','items','hp','xp','rep','quests','completed','careerStats','flags','storyFlags','keyPoints'];for(const key of keys)if(Object.prototype.hasOwnProperty.call(data.state,key))g[key]=data.state[key];window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);if(data.message)log(data.message);render();});
 zoneSocket.on('player:item:result',data=>{if(!data?.ok||!data.state){if(data?.message)log(data.message);return;}const protectedFields=['money','items','hp','xp','rep','hunger','thirst','stamina','radiation','radiationProtectionUntil','needs'];for(const key of protectedFields)if(Object.prototype.hasOwnProperty.call(data.state,key))g[key]=data.state[key];window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);log('Предмет использован. Сервер подтвердил изменения.');render();});
 zoneSocket.on('npc:combat:turn',data=>{if(!battle||battle.npcId!==data?.npcId)return;battle.enemy.hp=Number(data.enemyHp)||0;battle.enemy.maxHp=Math.max(battle.enemy.maxHp,battle.enemy.hp);g.hp=Number(data.playerHp)||g.hp;if(data.state){for(const key of ['items','hp','xp','money','stamina','careerStats'])if(Object.prototype.hasOwnProperty.call(data.state,key))g[key]=data.state[key];}combatLog(data.message||'Ход рассчитан сервером.');renderCombat();window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);});
 zoneSocket.on('npc:combat:result',data=>{if(!data?.ok){if(data?.message)log(data.message);return;}if(data.state){const keys=['money','items','hp','xp','rep','careerStats','quests','stamina'];for(const key of keys)if(Object.prototype.hasOwnProperty.call(data.state,key))g[key]=data.state[key];}if(data.outcome==='win'||data.outcome==='escaped'||data.outcome==='defeat'){battle=null;$('combatOverlay')?.classList.remove('show');if(data.outcome==='defeat'){window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);playerDeath(data.message||'погиб в бою',true);return;}log(data.message||'Бой завершён.');render();}window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);});
 zoneSocket.on('player:save:ack',data=>{if(!data?.state)return;const protectedFields=['money','items','hp','xp','rep','quests','careerStats','faction','characterCreated','visitedLocations','equipment','weaponSlots','armor','artifacts','skills','rank','reputation','stash','stashItems','tradeHistory','level','perks','achievements','contracts','hunger','thirst','stamina','radiation','radiationProtectionUntil','survivalServerAt','serverShelterUntil'];for(const key of protectedFields){if(Object.prototype.hasOwnProperty.call(data.state,key))g[key]=data.state[key];}if(data.position&&Number.isFinite(Number(data.position.x))&&Number.isFinite(Number(data.position.y)))g.worldPosition={x:Number(data.position.x),y:Number(data.position.y)};window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);renderInventory();});
 zoneSocket.on('player:ready',data=>{
  zonePlayerReady=true;
  if(zoneHelloReadyTimer){clearTimeout(zoneHelloReadyTimer);zoneHelloReadyTimer=null;}
  setOnlineConnectionState('online',data.persistent?'Гостевой мультиплеер подключён. Мир сохраняется на сервере.':'Гостевой мультиплеер подключён. Сервер работает без постоянной базы.');
  zonePlayerId=data.id;localStorage.setItem('zoneOnlinePlayerId',zonePlayerId);if(data.sessionToken)localStorage.setItem('zoneGuestSessionToken',data.sessionToken);if(data?.world?.playerSquads){const squad=Object.values(data.world.playerSquads).find(q=>q.members?.some(m=>m.id===zonePlayerId));renderPlayerSquad({squad:squad||null});}renderPlayerFriends(data?.world?.playerFriends?.[zonePlayerId]||[]);
  if(data.savedState&&typeof data.savedState==='object'){applyingServerState=true;g=data.savedState;if(g.dead||Number(g.hp)<=0){applyingServerState=false;playerDeath(g.deathCause||'погиб в Зоне');return;}if(g.characterCreated===undefined)g.characterCreated=true;migrateWorld();window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);applyingServerState=false;render();if(g.characterCreated)$('characterSetup')?.classList.remove('show');else if(!$('characterSetup')?.classList.contains('show'))openCharacterSetup();}
  if(data.position&&Number.isFinite(Number(data.position.x))&&Number.isFinite(Number(data.position.y))){g.worldPosition={x:Number(data.position.x),y:Number(data.position.y)};g.mapCoordinateVersion=2;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);}
  serverWorld=data.world||null;if(serverWorld?.emission){g.emission={...serverWorld.emission,active:serverWorld.emission.phase==='active',warning:serverWorld.emission.phase==='warning'};window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);}syncNpcRosterToClient();applyWorldSync(data.worldSync);if(serverWorld?.discoveredPoints)applySharedDiscoveredPoints(serverWorld.discoveredPoints);renderWar();renderOnlineWorldStatus(data.status);if(serverWorld?.diplomacy){g.diplomacy=serverWorld.diplomacy;renderDiplomacy();}if(serverWorld?.npcPositions)applySharedNpcPositions(serverWorld.npcPositions);renderCoopQuests(serverWorld?.coOpQuests||[]);
  applyLeaderboard(data.leaderboard||[]);onlinePlayers=data.players||[];serverChat=(data.chat||[]).filter(m=>!m.location||m.location===g.loc);renderOnlinePlayers();renderServerChat();
  if($('mpName'))$('mpName').value=g.name;if($('localChatHeading'))$('localChatHeading').textContent=`Локальный канал КПК · ${locationName(g.loc)}`;
  $('mpStatusText').textContent=data.persistent?'Гостевой режим · профиль и общий мир сохраняются на сервере.':'Гостевой режим · данные сервера хранятся в памяти и сбросятся после перезапуска.';
  if(!data.savedState)zoneSocket.emit('player:save',g);
  renderPlayerTrade();renderIncomingTrades();mpSyncLocation();zoneSocket.emit('stash:state');renderStashes();
 });
 zoneSocket.on('radio:state',data=>{factionRadioMessages=data?.messages||[];renderFactionRadio();});
 zoneSocket.on('artifact-expedition:state',data=>renderCoopArtifactExpeditions(data?.expeditions||[]));
 zoneSocket.on('artifact-expedition:update',data=>{if(data?.expeditions)renderCoopArtifactExpeditions(data.expeditions);if(data?.message)log(data.message);});
 zoneSocket.on('artifact-expedition:result',data=>{if(data?.state){g=data.state;save();renderInventory();}if(data?.message)alert(data.message);if(data?.expeditions)renderCoopArtifactExpeditions(data.expeditions);});
 zoneSocket.on('radio:message',message=>{if(!message||message.faction!==g.faction)return;if(!factionRadioMessages.some(x=>x.id===message.id))factionRadioMessages.push(message);factionRadioMessages=factionRadioMessages.slice(-100);renderFactionRadio();renderMapIntel();});
 zoneSocket.on('world:leaderboard',data=>{applyLeaderboard(data);});
 zoneSocket.on('world:players',list=>{onlinePlayers=list||[];renderOnlinePlayers();renderPlayerTrade();renderOnlineWorldStatus();if(activePlayerDM&&!onlinePlayers.some(p=>p.id===activePlayerDM&&p.location===g.loc)){activePlayerDM=null;renderPlayerDM();}});
 zoneSocket.on('player:expedition-result',data=>{updateMoveOrderStatus(data?.message||'Состояние экспедиции обновлено');if(data?.cancelled){pendingKeyPointApproach=null;preservePendingKeyPointApproach=false;g.expedition=null;if(expeditionVisualTimer){clearInterval(expeditionVisualTimer);expeditionVisualTimer=null;}if(localExpeditionTimer){clearInterval(localExpeditionTimer);localExpeditionTimer=null;}save();}if(data?.ok&&data.expedition){g.expedition=data.expedition;if(!g.expedition.startedAt)g.expedition.startedAt=Date.now();startExpeditionVisual();zoneMapMode='zone';zoneMapCenter=null;save();if($('world')?.classList.contains('active'))renderZoneMap();}});
 zoneSocket.on('player:expedition-step',data=>{if(!data?.location)return;const previousLocation=g.loc;if(data.state&&typeof data.state==='object')g={...g,...data.state};g.loc=data.location;recordSectorArrival(previousLocation,data.location);const c=sectorCenter(data.location);g.worldPosition={x:c[0],y:c[1]+24};g.expedition=data.arrived?null:{...(g.expedition||{}),path:data.route,index:data.index,startedAt:Date.now()};if(g.expedition&&!g.expedition.nextHopAt)g.expedition.nextHopAt=Date.now()+90000;activeNpc=null;save();render();view('world');if(data.arrived&&expeditionVisualTimer){clearInterval(expeditionVisualTimer);expeditionVisualTimer=null;}else startExpeditionVisual();updateMoveOrderStatus(data.arrived?'Экспедиция завершена':'Прибыл в сектор '+locationName(data.location));log('Экспедиция: переход в сектор '+locationName(data.location)+'.');zoneSocket.emit('stash:state');if(data.arrived&&pendingKeyPointApproach&&pendingKeyPointApproach.location===g.loc){const targetId=pendingKeyPointApproach.id;pendingKeyPointApproach=null;requestAnimationFrame(()=>approachKeyPoint(targetId));}});
 zoneSocket.on('player:sector-entered',data=>{if(!data?.location)return;const previous=g.loc;g.loc=data.location;g.worldPosition={x:Number(data.x)||0,y:Number(data.y)||0};g.mapCoordinateVersion=2;recordSectorArrival(previous,data.location);activeNpc=null;save();render();renderZoneMap();log(`Ты пересёк границу сектора. Теперь ты находишься: ${locationName(data.location)}.`);});
 zoneSocket.on('player:movement',data=>{if(!data)return;g.worldPosition={x:Number(data.x)||0,y:Number(data.y)||0};g.mapCoordinateVersion=2;playerMoving=!!data.moving;if(!data.moving){playerMoveTarget=null;walkTarget=null;updateMoveOrderStatus('Ты достиг отмеченной точки');}else updateMoveOrderStatus('Персонаж следует к метке');updatePlayerMapMarker();window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);});
 zoneSocket.on('player:move-result',data=>{updateMoveOrderStatus(data?.order?.etaSeconds?`${data.message} · примерно ${data.order.etaSeconds} сек.`:(data?.message||'Обновление приказа'));if(data?.ok===false)alert(data.message||'Не удалось построить маршрут.');else if(data?.message)log(data.message);});
 zoneSocket.on('player:travel-event',data=>{updateMoveOrderStatus('Маршрут остановлен: опасность впереди');news('Опасность на маршруте',data?.message||'Обнаружена угроза.');log(data?.message||'На маршруте обнаружена опасность.');const choice=prompt((data?.message||'На маршруте обнаружена опасность.')+'\n\n1 — вступить в бой\n2 — продолжить скрытно\n3 — отступить','2');const action=choice==='1'?'fight':choice==='3'?'retreat':'continue';zoneSocket.emit('player:travel-response',{action});if(action!=='continue'){playerMoveTarget=null;walkTarget=null;}if(action==='fight'){if(data?.type==='hostile_squad'&&data?.npcId)startNpcEncounter(data.npcId);else startRandomEncounter(true);}});
 zoneSocket.on('npc:approach',data=>{showNpcApproach(data);news('Сталкер вышел на контакт',data.text||'Сталкер подошёл поговорить.');});
 zoneSocket.on('npc:threat',data=>{const n=npcBy(data?.npcId);if(!n||battle)return;log(`Внимание: ${data.name||n.name} (${data.faction||n.faction}) вошёл в радиус боя. Расстояние: ${data.distance||'—'} м.`);if(npcInCombatRange(n)&&isHostileNpcFaction(n.faction))startNpcEncounter(n.id);});
 zoneSocket.on('friend:invite',data=>{if(confirm(`${data.name} предлагает добавить тебя в друзья. Принять?`))zoneSocket.emit('friend:respond',{fromId:data.fromId,accept:true});else zoneSocket.emit('friend:respond',{fromId:data.fromId,accept:false});});
 zoneSocket.on('friend:state',data=>renderPlayerFriends(data?.friends||[]));
 zoneSocket.on('friend:result',data=>{if(data?.message)alert(data.message);});
 zoneSocket.on('squad:invite',data=>{if(confirm(`Сталкер ${data.leader} приглашает тебя в отряд «${data.name}». Принять?`))zoneSocket.emit('squad:respond',{squadId:data.squadId,accept:true});else zoneSocket.emit('squad:respond',{squadId:data.squadId,accept:false});});
 zoneSocket.on('squad:state',data=>{renderPlayerSquad(data);if($('squads')?.classList.contains('active'))renderSquads();});
 zoneSocket.on('squad:travelled',data=>{if(!data?.location||!g.locations.some(l=>l.id===data.location))return;g.loc=data.location;activeNpc=null;save();render();view('world');log(`Отряд прибыл в сектор ${locationName(data.location)}.`);});
 zoneSocket.on('squad:encounter',data=>{if(!data)return;news('Встреча отрядов',data.text||'В секторе замечена другая группа.');log(data.text||'В секторе замечена другая группа.');});
 zoneSocket.on('squad:result',data=>{if(data?.message)alert(data.message);});
 zoneSocket.on('dm:history',data=>{playerDMHistory[data.targetId]=data.history||[];if(activePlayerDM===data.targetId)renderPlayerDM();});
 zoneSocket.on('player:spawned',data=>{if(data?.state){applyingServerState=true;g=data.state;migrateWorld();window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);applyingServerState=false;render();log(`Ты прибыл на базу группировки: ${spawnNames[data.location]||data.location}.`);}});
 zoneSocket.on('dm:message',m=>{const other=m.fromId===zonePlayerId?m.toId:m.fromId;playerDMHistory[other] ||= [];if(!playerDMHistory[other].some(x=>x.id===m.id))playerDMHistory[other].push(m);if(activePlayerDM===other)renderPlayerDM();else log('Новое личное сообщение от '+(m.fromName||'сталкера')+'.');});
 zoneSocket.on('dm:error',data=>alert(data?.message||'Личный канал недоступен.'));
 zoneSocket.on('npc:trade:result',data=>{if(data?.economy&&activeNpc){serverWorld=serverWorld||{};serverWorld.npcEconomy=serverWorld.npcEconomy||{};serverWorld.npcEconomy[activeNpc]={...(serverWorld.npcEconomy[activeNpc]||{}),...data.economy};}if(data?.state){g=data.state;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);render();if(activeNpc)openNpcTrade(activeNpc);else renderTrade();}alert(data?.message||'Обмен завершён.');});
 zoneSocket.on('world:sync',data=>applyWorldSync(data));
 zoneSocket.on('world:status',data=>renderOnlineWorldStatus(data));
 zoneSocket.on('world:emission',data=>{if(!data?.phase)return;serverWorld=serverWorld||{};serverWorld.emission=data;g.emission={...data,active:data.phase==='active',warning:data.phase==='warning'};window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);renderLivingZone();});
 zoneSocket.on('player:survival:update',data=>{if(data?.state&&typeof data.state==='object'){g={...g,...data.state};window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);render();if(data.message){survivalEvent(data.message,data.state.emission?.active);log(data.message);}}});
 zoneSocket.on('world:event',ev=>{if(!ev||!Number.isFinite(Number(ev.revision)))return;const current=Number(localStorage.getItem('zoneWorldRevision')||0);if(Number(ev.revision)<=current)return;localStorage.setItem('zoneWorldRevision',String(ev.revision));renderOnlineWorldStatus();handleOnlineWorldEvent(ev);});
 zoneSocket.on('world:npcs',positions=>applySharedNpcPositions(positions));
 zoneSocket.on('world:npc-motion',payload=>animateNpcMotion(payload));
 zoneSocket.on('world:mutant-motion',payload=>{const packs=serverWorld?.ecosystem?.mutantPacks||[],packIndex=new Map(packs.map(x=>[String(x.id),x]));for(const update of payload?.packs||[]){const pack=packIndex.get(String(update.id));if(pack){pack.x=update.x;pack.y=update.y;pack.location=update.location||pack.location;}const marker=mutantMarkerElements.get(String(update.id));if(marker){marker.style.transition='transform 950ms linear';marker.setAttribute('transform',`translate(${update.x-10} ${update.y+9}) scale(.42)`);}}});
 zoneSocket.on('npc:combat-engaged',data=>{if(!data)return;g.hp=Number.isFinite(Number(data.playerHp))?Math.max(0,Number(data.playerHp)):g.hp;save();renderQuick();log(`Перестрелка! ${data.name} (${data.faction}) обнаружил тебя на расстоянии ${data.distance} м. Получено урона: ${data.playerDamage}.`);news('Началась перестрелка',`${data.name} вступил с тобой в бой. Твоё здоровье: ${g.hp}%.`);if(data.npcDown)log(`${data.name} больше не представляет угрозы.`);});
 zoneSocket.on('world:npc-event',ev=>{if(!ev)return;const titles={mutant_npc_combat:'Схватка с мутантами',npc_skirmish:'Перестрелка между отрядами',npc_squad_raid:'Рейд сталкерского отряда',npc_replacement:'Новый сталкер в Зоне',npc_travel:'Сталкер сменил сектор',npc_dialogue_updated:'Новые разговоры у сталкеров',npc_rescue_dispatched:'Отряд выдвинулся на спасение',npc_rescue_pickup:'Раненый сталкер найден',npc_rescue_completed:'Операция спасения завершена',npc_squad_formed:'Сталкеры объединились',npc_rumor_shared:'Передан слух',npc_road_encounter:'Встреча на дороге',npc_goods_delivered:'Торговец получил товар'};g.news.unshift({day:realClock().day,hour:realClock().time,title:titles[ev.type]||'Событие среди сталкеров',body:ev.text||'Изменения активности NPC.'});g.news=g.news.slice(0,60);renderNews();log('Сводка КПК: '+(ev.text||'активность сталкеров')+'.');});
 zoneSocket.on('player:death',data=>{playerDeath(data?.cause||'погиб в перестрелке',true);});
 zoneSocket.on('npc:combat:result',data=>{if(data?.ok===false)alert(data.message||'Сервер отклонил результат столкновения.');});
 zoneSocket.on('npc:corpse:loot:result',data=>{if(data?.ok&&data.state){g={...g,...data.state};window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);renderInventory();render();}if(data?.message){alert(data.message);log(data.message);}renderCorpseRecovery();});
 zoneSocket.on('stash:state',data=>{currentStashes=data?.stashes||[];renderStashes();if($('world')?.classList.contains('active'))renderZoneMap();});
 zoneSocket.on('stash:search:result',data=>{if(data?.state){g={...g,...data.state};window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);renderInventory();}if(data?.stashes)currentStashes=data.stashes;if(data?.note){g.stashNotes||=[];g.stashNotes.unshift({text:data.note,location:g.loc,at:Date.now()});g.stashNotes=g.stashNotes.slice(0,40);window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);}if(data?.message){log(data.message);alert(data.message);}renderStashes();if($('world')?.classList.contains('active'))renderZoneMap();});
 zoneSocket.on('stash:loot:result',data=>{if(data?.state){g={...g,...data.state};window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);renderInventory();render();}if(data?.message){log(data.message);alert(data.message);}zoneSocket.emit('stash:state');});
 zoneSocket.on('stash:buy-intel:result',data=>{if(data?.state){g={...g,...data.state};window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);render();}if(data?.stashes)currentStashes=data.stashes;if(data?.message){log(data.message);alert(data.message);}renderStashes();if(activeNpc)openNpcTrade(activeNpc);});
 zoneSocket.on('world:npc-state',data=>{const previousVersion=activeNpc?npcBy(activeNpc)?.dialogueVersion:null;serverWorld=serverWorld||{};serverWorld.npcState=data?.npcs||{};serverWorld.npcEvents=data?.events||[];zoneMapDirty=true;serverWorld.npcSquads=data?.squads||[];serverWorld.npcMemorial=data?.memorial||[];serverWorld.npcCorpses=data?.corpses||[];serverWorld.factionNotices=data?.factionNotices||[];serverWorld.rescueOperations=data?.rescueOperations||[];serverWorld.battlefronts=data?.battlefronts||[];serverWorld.convoys=data?.convoys||[];serverWorld.factionBases=data?.factionBases||[];serverWorld.frontlineOrders=data?.frontlineOrders||[];serverWorld.keyPoints=data?.keyPoints||serverWorld.keyPoints||{};serverWorld.factionObjectives=data?.factionObjectives||serverWorld.factionObjectives||{};serverWorld.factionResources=data?.factionResources||serverWorld.factionResources||{};serverWorld.factionCommand=data?.factionCommand||serverWorld.factionCommand||{};serverWorld.factionWarHistory=data?.factionWarHistory||serverWorld.factionWarHistory||[];serverWorld.factionPacts=data?.factionPacts||serverWorld.factionPacts||[];serverWorld.factionRecovery=data?.factionRecovery||serverWorld.factionRecovery||{};syncNpcRosterToClient();const active=npcBy(activeNpc);if(active&&previousVersion!==null&&previousVersion!==active.dialogueVersion){const box=dialogueTarget(),choices=box?.querySelector('.choices');if(choices)choices.innerHTML=(active.topics||[]).map((t,i)=>`<button onclick="topic('${active.id}',${i})">› ${escapeHtml(t[0])}</button>`).join('')+`<button onclick="closeTalk()">Попрощаться</button>`;const hint=box?.querySelector('.dialogue-top .small');if(hint)hint.textContent='Темы разговора обновились · доверие: '+(Number(active.relationship)||0);}renderPeople();if($('zoneReports')?.classList.contains('active'))renderZoneReports();renderQuick();renderWar();if($('world')?.classList.contains('active'))renderMap();renderCorpseRecovery();});
 zoneSocket.on('world:ecosystem',data=>{serverWorld=serverWorld||{};serverWorld.ecosystem=data;renderLivingZone();});
 zoneSocket.on('ecosystem:result',data=>{if(data?.state){g=data.state;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);render();}alert(data?.message||'');renderLivingZone();});
 zoneSocket.on('survival:hunt:result',data=>{if(data?.state){g=data.state;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);}if(data?.ecosystem){serverWorld=serverWorld||{};serverWorld.ecosystem=data.ecosystem;}if(data?.message){survivalEvent(data.message,!data.ok);log(data.message);alert(data.message);}save();renderInventory();renderLivingZone();if($('world')?.classList.contains('active'))renderZoneMap();});

 zoneSocket.on('npc:specialist:result',data=>{
  if(data?.state){g=data.state;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);render();renderInventory();}
  if(data?.message)alert(data.message);
 });
 zoneSocket.on('npc:interaction-result',data=>{
 if(data?.npcId&&ignoreNpcInteractionReplyFor===data.npcId){ignoreNpcInteractionReplyFor=null;return;}
 if(data?.reply){
  const n=npcBy(data.npcId);
  if(n&&data.dialogue){n.greeting=data.dialogue.greeting;n.topics=data.dialogue.topics;}
  if(n){showNpcDialogue();renderCopDialogue(n,data.reply,data.dialogue?.topics||n.topics||[]);}
  else alert(data.reply);
 }else if(data?.reason)alert(data.reason);
});
 zoneSocket.on('world:poi',points=>applySharedDiscoveredPoints(points));
 zoneSocket.on('world:zoneEvent',ev=>{g.news.unshift({day:realClock().day,hour:realClock().time,title:ev.title,body:ev.body});g.news=g.news.slice(0,60);renderNews();log('Сводка КПК: '+ev.title+'.');});
 zoneSocket.on('world:coop',list=>renderCoopQuests(list));
 zoneSocket.on('war:state',data=>{serverWorld=serverWorld||{};serverWorld.warOperations=data.operations||[];serverWorld.warHistory=data.history||[];serverWorld.keyPoints=data.keyPoints||serverWorld.keyPoints||{};serverWorld.factionObjectives=data.objectives||serverWorld.factionObjectives||{};serverWorld.factionResources=data.resources||serverWorld.factionResources||{};serverWorld.factionCommand=data.commands||serverWorld.factionCommand||{};serverWorld.factionWarHistory=data.factionWarHistory||serverWorld.factionWarHistory||[];renderWar();if($('world')?.classList.contains('active'))renderZoneMap();});
 zoneSocket.on('war:result',data=>{if(data.state){g=data.state;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);render();}if(data.world)serverWorld=data.world;alert(data.message||'');renderWar();});
 zoneSocket.on('war:reward',data=>{if(data.state){g=data.state;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);render();}alert(data.won?'Победа! +180 ₽, +35 опыта и +5 репутации.':'Операция завершена. +35 опыта, репутация скорректирована.');});
 zoneSocket.on('trade:incoming',offer=>{if(!offer?.id||incomingTrades.some(x=>x.id===offer.id))return;incomingTrades.push(offer);renderIncomingTrades();});
 zoneSocket.on('market:result',data=>{if(data.state){g=data.state;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);if(data.ok)tradeBasket={buy:{},sell:{}};render();renderTrade();}alert(data.message||'Операция выполнена.');});
 zoneSocket.on('trade:result',data=>{if(data?.offerId&&data.ok)incomingTrades=incomingTrades.filter(x=>x.id!==data.offerId);if(data.state){g=data.state;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);render();renderTrade();}renderPlayerTrade();renderIncomingTrades();if(data.message)alert(data.message);});
 zoneSocket.on('coop:result',data=>{alert(data.message||'');});
 zoneSocket.on('coop:reward',data=>{if(data.state){g=data.state;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);render();}alert(`Совместное задание выполнено: +${data.reward} ₽ и ${data.xp} опыта.`);});
 zoneSocket.on('world:chat:history',list=>{serverChat=(list||[]).filter(m=>!m.location||m.location===g.loc);renderServerChat();});
 zoneSocket.on('world:chat',m=>{if(m.location&&m.location!==g.loc)return;serverChat.push(m);if(serverChat.length>100)serverChat=serverChat.slice(-100);renderServerChat();});
 zoneSocket.on('world:update',data=>{serverWorld=data.world||serverWorld;if(Number.isFinite(Number(serverWorld?.revision)))localStorage.setItem('zoneWorldRevision',String(serverWorld.revision));renderOnlineWorldStatus();renderWar();renderCoopQuests(serverWorld?.coOpQuests||[]);if(serverWorld?.diplomacy){g.diplomacy=serverWorld.diplomacy;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);renderDiplomacy();}if(data.notice){g.news.unshift({day:realClock().day,hour:realClock().time,title:'Мировая сводка',body:data.notice});g.news=g.news.slice(0,40);renderNews();}});
 zoneSocket.on('diplomacy:result',data=>{if(!data.ok){alert(data.message||'Операция не выполнена.');return;}if(data.state){g.money=data.state.money;g.rep=data.state.rep;window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);}if(data.world?.diplomacy)g.diplomacy=data.world.diplomacy;render();});
  zoneSocket.connect();
 }catch(error){console.error('Socket.IO initialization failed:',error);setOnlineConnectionState('offline','Не удалось запустить сетевой клиент: '+(error?.message||'неизвестная ошибка'));}
}
function mpConnect(){
 const field=$('mpServerUrl'),raw=(field?.value||'').trim();
 if(raw){
  let parsed;try{parsed=new URL(raw);}catch{return alert('Укажи полный адрес сервера, например https://zone-online.onrender.com');}
  if(!['http:','https:'].includes(parsed.protocol))return alert('Адрес сервера должен начинаться с http:// или https://');
  localStorage.setItem('zoneServerUrl',parsed.origin);
 }else localStorage.removeItem('zoneServerUrl');
 setOnlineConnectionState('connecting','Проверяем сервер. Если Render уснул после простоя, сначала дождёмся его запуска, затем подключим мультиплеер…');
 connectZone();
}
// All normal game saves are mirrored to the server. The server keeps one profile per player.
save=function(){window.ZoneCore.state.set(g, "local-save");window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey,g);render();if(!applyingServerState&&zoneSocket?.connected&&zonePlayerId){zoneSocket.emit('player:save',g);zoneSocket.emit('player:update',{name:g.name,location:g.loc,faction:g.faction});}};
// Vendor transactions are validated by the server while online.
buy=function(i){const x=tradeGoods()[i];if(!x)return;if(zoneSocket?.connected){zoneSocket.emit('market:buy',{item:x[1]});return;}if(g.money<x[3])return alert('Не хватает рублей.');g.money-=x[3];addItem(x[1],x[0],x[2],x[5],x[4],Math.floor(x[1]==='bolt'?5:1));const gear=x[2]==='Броня'?{condition:100,defense:({armor_leather:2,armor_stalker:3,armor_zarya:5,armor_seva:7,armor_bulat:9,armor_exo:11,armor_sunrise:4,armor_berill:8,armor_guardian:7,armor_cs3a:7,armor_ps5m:6})[x[1]]||2}:x[2]==='Шлем'?{condition:100,defense:({helmet_stalker:1,helmet_zarya:2,helmet_seva:3,helmet_bulat:4})[x[1]]||1}:x[2]==='Рюкзак'?{capacity:({backpack_field:65,backpack_expedition:80})[x[1]]||50}:{};Object.assign(g.items.find(z=>z.id===x[1]),gear);log('Куплено: '+x[0]+'.');save();};
sell=function(id,amount=1){const x=g.items.find(i=>i.id===id);if(!x)return;amount=Math.max(1,Math.min(x.qty,Math.floor(Number(amount)||1)));if(zoneSocket?.connected){zoneSocket.emit('market:sell',{item:id,qty:amount});return;}x.qty-=amount;const payout=window.ZoneEconomy.saleTotal(x,amount);g.money+=payout;if(x.qty<=0)g.items=g.items.filter(i=>i.id!==id);log('Продано: '+x.name+' ×'+amount+' · +'+payout+' ₽.');save();};
// Diplomacy is a shared server-side operation, not a client-only counter.
adjustDiplomacy=function(name,action){if(!zoneSocket?.connected)return alert('Подключись к общей Зоне, чтобы вести переговоры.');zoneSocket.emit('diplomacy:action',{target:name,action});};
if($('mpMessage'))$('mpMessage').addEventListener('keydown',e=>{if(e.key==='Enter')mpSend();});
connectZone();
async function toggleGameFullscreen(){
 try{
  if(!document.fullscreenElement){await document.documentElement.requestFullscreen?.();}
  else{await document.exitFullscreen?.();}
 }catch(error){console.warn('Fullscreen mode is unavailable in this browser:',error);}
}
function openTitleScreen(){
 document.body.classList.add('title-screen-active');
 if($('titleScreen'))$('titleScreen').hidden=false;
 closeTitleOptions();
 const hasSave=!!window.ZoneCore.saveManager.read(window.ZoneCoreConfig.saveKey,null)&&!!g.characterCreated;
 const resume=$('titleContinue');
 if(resume){resume.disabled=!hasSave;resume.querySelector('small').textContent=hasSave?`${playerDisplayName()} · ${g.faction} · ${here()?.name||'Зона'}`:'Сохранение не найдено';}
}
function continueZoneGame(){
 $('titleCredits')?.setAttribute('hidden','');
 document.body.classList.remove('title-screen-active');
 if(!g.characterCreated){openCharacterSetup();return;}
 $('characterSetup')?.classList.remove('show');render();renderOnlineWorldStatus?.();
}
function beginNewZoneGame(){
 if(g.characterCreated&&!confirm('Начать новую игру? Текущее локальное сохранение будет заменено.'))return;
 window.ZoneCore.saveManager.remove(window.ZoneCoreConfig.saveKey);
 g=clone(base);g.characterCreated=false;setupFaction='Одиночки';characterPortraitPicker.set(characterSetupProfile.DEFAULT_PORTRAIT);setupBackground='wanderer';
 document.body.classList.remove('title-screen-active');
 $('titleScreen')?.setAttribute('hidden','');
 openCharacterSetup();
}
function enterZoneOnline(){continueZoneGame();}
function openTitleOptions(){
 const panel=$('titleOptionsPanel');if(!panel)return;
 applyGameOptions();
 if($('titleMenuPanel'))$('titleMenuPanel').hidden=true;panel.hidden=false;
}
function closeTitleOptions(){const panel=$('titleOptionsPanel');if(panel)panel.hidden=true;if($('titleMenuPanel'))$('titleMenuPanel').hidden=false;}
function showTitleCredits(){$('titleCredits')?.removeAttribute('hidden');}
function hideTitleCredits(){$('titleCredits')?.setAttribute('hidden','');}
function openTitleTerminalSection(id){
 const allowed=new Set(['world','quests','profile','factions','people','encyclopedia','radio','multiplayer','living']);
 if(!allowed.has(id))return;
 if(!g.characterCreated){alert('Сначала зарегистрируй сталкера или загрузи существующее сохранение.');beginNewZoneGame();return;}
 continueZoneGame();
 view(id);
 document.querySelectorAll('[data-terminal-view]').forEach(button=>button.classList.toggle('active',button.dataset.terminalView===id));
}
document.querySelectorAll('[data-terminal-view]').forEach(button=>button.addEventListener('click',()=>openTitleTerminalSection(button.dataset.terminalView)));
if(!g.characterCreated)openTitleScreen();else openTitleScreen();
