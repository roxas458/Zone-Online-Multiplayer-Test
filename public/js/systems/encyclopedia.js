/* ZONE ONLINE encyclopedia UI and entry composition. Game state and content catalogs are injected. */
(function(root){
  'use strict';
  function createEncyclopediaSystem({getState,getEntries,getAnomalyDossiers,getWeaponCatalogue,getArtifactDefinitions,weaponGlyph,locationName,escapeHtml,$}) {
let encyclopediaSelected='intro';
  let encyclopediaExpanded={intro:true,training:false,creatures:false,anomalies:false,locations:false,artifacts:false,history:false,societies:false};
function encyclopediaBase(){
 const g=getState();
 const encyclopediaEntries=getEntries();
 const anomalyDossiers=getAnomalyDossiers();
 const entries=[];
 const add=(id,group,title,subtitle,body,extra='',symbol='▤')=>entries.push({id,group,title,subtitle,body,extra,symbol});
 add('intro','intro','Энциклопедия Зоны','Полевой справочник','Зона не сводится к карте и перечню опасностей. Это изменчивая территория со своей географией, экономикой, сообществами и памятью. Сведения в КПК собираются из разговоров, личных наблюдений, исследовательских отчётов и архивных материалов.\n\nНе все записи одинаково надёжны: часть основана на проверенных наблюдениях, часть передаётся со слов сталкеров. Сверяй сведения с обстановкой на месте и отмечай новые открытия.','Справочная система КПК · редакция полевого архива','⌕');
 add('training','training','Первый выход в Зону','Обучение','Перед экспедицией проверь состояние персонажа, запас воды и еды, медикаменты, защиту и свободное место в рюкзаке. Изучи карту, отметь цель и оцени риск маршрута.\n\nВеди журнал наблюдений: записывай найденные ориентиры, необычные сигналы, встречи и изменения контроля над территориями. Возвращайся к торговцам и проводникам за обновлённой информацией.','Учебная запись · основы подготовки и ориентирования','▣');
 add('training-radio','training','Связь и полевые заметки','Обучение','Радиосообщения помогают узнавать о передвижениях отрядов, просьбах о помощи и событиях в соседних секторах. Относись к неподтверждённым сообщениям как к слухам, пока не появится независимое подтверждение.\n\nПолевые заметки сохраняют имена, места и обстоятельства встреч. Такие записи могут оказаться полезнее старой карты.','Памятка связиста','⌁');
 for(const x of encyclopediaEntries.mutants)add('mutant-'+x[0],'creatures',x[0],x[1],x[2]+'\n\nПолевые наблюдения о повадках и местах встреч могут различаться. Сталкеры фиксируют следы, характерные звуки и изменения поведения местной фауны. Необычная активность иногда указывает на изменение обстановки в секторе.','Досье фауны · сведения собраны по полевым сообщениям','☣');
 for(const x of anomalyDossiers)add('anomaly-'+x[0],'anomalies',x[0],'Аномалия · '+x[1],x[2]+'\n\nИсследователи связывают появление артефактов с особенностями отдельных аномальных полей. Их состав и активность могут меняться. Сведения о конкретном месте проверяй по свежим отметкам и сообщениям.','Классификация: '+x[1]+' · '+x[3],'⌁');
 for(const l of g.locations){add('loc-'+l.id,'locations',l.name,'Сектор · контроль: '+l.owner+' ('+l.control+'%)',l.desc+'\n\nКаждый сектор имеет собственные маршруты, точки интереса и уровень риска. Здесь могут встречаться патрули, торговцы, мутанты и исследовательские группы. Состояние территории меняется вместе с событиями Зоны.','Ключевых точек: '+(g.keyPoints?.[l.id]||[]).length+' · открыто: '+(g.keyPoints?.[l.id]||[]).filter(p=>p.discovered).length,'▦');for(const k of g.keyPoints?.[l.id]||[])add('poi-'+k.id,'locations',k.name,l.name+' · '+k.kind,k.desc+'\n\nОтметка на карте: '+(k.discovered?'изучена':'пока не изучена')+'. По мере исследования здесь могут появляться новые сведения.','Точка интереса · '+(k.discovered?'обнаружена':'неизвестна'),'⌖');}
 for(const x of encyclopediaEntries.artifacts)add('artifact-'+x[0],'artifacts',x[0],x[1],x[2]+'\n\nАртефакты интересуют торговцев и исследовательские группы. Их свойства, редкость и стоимость зависят от типа находки и текущего спроса. Веди запись о месте обнаружения и передавай образцы специалистам для изучения.','Каталог артефактов · полевое и научное описание','✧');
 add('history','history','Хронология Зоны','История Зоны','После катастрофы территория вокруг Чернобыльской АЭС стала известна как Зона. Со временем здесь появились аномальные поля, необычные формы жизни и предметы с неизвестными свойствами.\n\nПервые экспедиции сменились постоянными маршрутами сталкеров, научными исследованиями, военными операциями и борьбой за контроль над ценными территориями. Каждая новая группа оставляет собственные записи, а многие события известны лишь по противоречивым свидетельствам.\n\nХронология КПК пополняется подтверждёнными игровыми событиями и найденными документами.','Историческая справка · внутриигровая хроника','◷');
 const societyText={ 'Одиночки':'Независимые исследователи, проводники и охотники за артефактами. Их связи строятся на личной репутации и взаимных договорённостях.','Долг':'Организованная группировка с дисциплиной и иерархией. Участники стремятся сдерживать опасности Зоны и укреплять контролируемые позиции.','Свобода':'Сообщество, выступающее за свободное исследование Зоны и доступ к её тайнам. Среди участников есть разведчики и специалисты по аномалиям.','Бандиты':'Разрозненные группы, ориентированные на наживу и контроль маршрутов. Отношения с ними зависят от конкретных лидеров и обстоятельств.','Военные':'Гарнизоны и патрули, контролирующие периметр и отдельные территории. Их действия определяются приказами и текущей обстановкой.','Наёмники':'Профессиональные группы, выполняющие контракты за вознаграждение. Их цели часто известны только заказчику и командиру отряда.','Учёные':'Исследовательские группы, изучающие аномалии, артефакты и необычную биологию Зоны. Для работы им нужны образцы и сопровождение.','Монолит':'Закрытое и крайне опасное сообщество, связанное с центральными районами Зоны. Сведения о его структуре остаются неполными.'};
 for(const f of g.factions){const title=f.name;add('society-'+title,'societies',title,'Общество · '+(f.style||'группировка'),(societyText[title]||'Группировка действует в нескольких секторах Зоны. Её влияние зависит от численности, снабжения, союзов и контроля маршрутов.')+'\n\nЧисленность по сводкам: '+f.members+'. Влияние: '+f.influence+'. Отношение к персонажу: '+(f.relation??0)+'.','Представитель: '+(f.leader?.name||'сведения уточняются'),'⚑');}
 for(const n of g.npcs)add('person-'+n.id,'societies',n.name,(n.role||'сталкер')+' · '+(n.faction||'неизвестная группировка'),(n.biography||n.desc||'Личное дело пока содержит мало сведений.')+'\n\nИзвестное местонахождение: '+locationName(n.loc||n.location)+'. Состояние: '+(n.alive===false?'погиб':'в Зоне')+'. Отношение: '+(g.relationships?.[n.id]??n.relationship??0)+'.','Персональное досье · данные могут обновляться','♙');
 return entries;
}
const encyclopediaGroups=[['intro','Об энциклопедии','⌕'],['training','Обучение','＋'],['creatures','Животные и мутанты','＋'],['anomalies','Аномалии','＋'],['locations','Локации','＋'],['artifacts','Артефакты','＋'],['history','История Зоны','＋'],['societies','Общества','＋']];
function selectEncyclopediaEntry(id){encyclopediaSelected=id;renderEncyclopedia();}
function toggleEncyclopediaGroup(id){encyclopediaExpanded[id]=!encyclopediaExpanded[id];renderEncyclopedia();}
function setEncyclopediaMode(mode){const knowledge=$('encyclopediaKnowledge'),armory=$('encyclopediaArmory');if(knowledge)knowledge.hidden=mode!=='knowledge';if(armory)armory.hidden=mode!=='armory';$('encyModeKnowledge')?.classList.toggle('active',mode==='knowledge');$('encyModeArmory')?.classList.toggle('active',mode==='armory');if(mode==='armory')renderArmory();}
function renderEncyclopedia(){
 const g=getState();
 const q=($('encyclopediaSearch')?.value||'').trim().toLowerCase(),entries=encyclopediaBase();
 let selected=entries.find(x=>x.id===encyclopediaSelected);
 if(q){const hit=entries.find(x=>(x.title+' '+x.subtitle+' '+x.body+' '+x.extra).toLowerCase().includes(q));if(hit)selected=hit;}
 if(!selected)selected=entries[0];encyclopediaSelected=selected.id;
 const tree=$('encyclopediaTree');if(tree){tree.innerHTML=encyclopediaGroups.map(([id,label,icon])=>{const list=entries.filter(x=>x.group===id),matches=list.filter(x=>!q||(x.title+' '+x.subtitle+' '+x.body).toLowerCase().includes(q));if(q&&!matches.length)return '';const open=!!encyclopediaExpanded[id]||!!q||id==='intro';return `<section class="pda-ency-group"><button class="pda-ency-group-toggle ${selected.group===id?'current':''}" onclick="toggleEncyclopediaGroup('${id}')"><span>${open?'−':'+'}</span>${escapeHtml(label)}</button>${open?`<div class="pda-ency-nodes">${matches.map(x=>`<button class="pda-ency-node ${selected.id===x.id?'selected':''}" onclick="selectEncyclopediaEntry('${escapeHtml(x.id)}')">${escapeHtml(x.title)}</button>`).join('')}</div>`:''}</section>`;}).join('')||'<div class="pda-ency-empty">Совпадений нет.</div>';}
 const article=$('encyclopediaArticle');if(article){const paragraphs=selected.body.split(/\n\n+/).map(t=>`<p>${escapeHtml(t)}</p>`).join('');article.innerHTML=`<div class="pda-ency-article-title"><span class="pda-ency-symbol">${selected.symbol}</span><div><div class="eyebrow">${escapeHtml(encyclopediaGroups.find(x=>x[0]===selected.group)?.[1]||'Справка')}</div><h2>${escapeHtml(selected.title)}</h2><div class="pda-ency-subtitle">${escapeHtml(selected.subtitle)}</div></div></div><div class="pda-ency-rule"></div><div class="pda-ency-copy">${paragraphs}</div><div class="pda-ency-note"><b>ПОЛЕВАЯ ЗАПИСЬ</b><span>${escapeHtml(selected.extra||'Материал архива КПК')}</span></div>`;}
 const path=$('encyclopediaPath');if(path)path.textContent='# /Справка/'+(encyclopediaGroups.find(x=>x[0]===selected.group)?.[1]||'Архив')+'/'+selected.title;
 const count=$('encyclopediaCount');if(count)count.textContent=`${entries.length} ЗАПИСЕЙ · ${entries.filter(x=>x.group===selected.group).length} В РАЗДЕЛЕ`;
 const stats=$('encyclopediaStats');if(stats)stats.textContent=`${entries.length} материалов · открыто точек: ${Object.values(g.keyPoints||{}).flat().filter(p=>p.discovered).length}`;
 const legacyList=$('encyclopediaList');if(legacyList)legacyList.innerHTML=entries.map(x=>`<article><b>${escapeHtml(x.title)}</b><p>${escapeHtml(x.body)}</p></article>`).join('');
}


function armoryCatalog(){
 const rows=[];
 const encyclopediaEntries=getEntries();
 const artifactDefinitions=getArtifactDefinitions();
 for(const w of getWeaponCatalogue())rows.push({id:w[0],name:w[1],category:'weapons',type:w[2],detail:`${w[3]} · ${w[4]}`,weight:w[5],price:w[6],condition:w[7],icon:weaponGlyph(w[0])||'▰',description:`${w[1]} — ${w[3].toLowerCase()}. Боеприпасы: ${w[4]}. Справочная масса и цена указаны в каталоге.`});
 for(const [i,a] of encyclopediaEntries.armor.entries())rows.push({id:`armor_${i}`,name:a[0],category:'armor',type:'Броня и костюмы',detail:a[1],weight:null,price:null,icon:'▣',description:a[2]});
 const helmets=[['helmet_stalker','Шлем сталкера','Базовая защита головы для повседневных вылазок.'],['helmet_zarya','Шлем «Заря»','Защитный шлем для работы в опасных районах.'],['helmet_seva','Герметичный шлем СЕВА','Часть герметичного научно-полевого комплекта.'],['helmet_bulat','Бронешлем «Булат»','Тяжёлый защитный шлем для усиленного комплекта.']];
 for(const x of helmets)rows.push({id:x[0],name:x[1],category:'helmets',type:'Шлем',detail:'Защита головы',icon:'⛑',description:x[2]});
 const detectors=[['detector','Детектор «Отклик»','Базовый прибор для поиска аномальных сигналов.'],['detector_bear','Детектор «Медведь»','Более информативный прибор для поиска артефактов.'],['detector_veles','Детектор «Велес»','Продвинутый детектор с точным отображением сигналов.'],['detector_svarog','Детектор «Сварог»','Экспериментальная система обнаружения аномальных объектов.'],['detector_hilka','Детектор «Хилка»','Специализированный сканер с расширенным поиском артефактных сигналов.']];
 for(const x of detectors)rows.push({id:x[0],name:x[1],category:'detectors',type:'Детектор',detail:'Поиск артефактов',icon:'⌁',description:x[2]});
 for(const a of encyclopediaEntries.artifacts)rows.push({id:`artifact_${a[0]}`,name:a[0],category:'artifacts',type:'Артефакт',detail:a[1],icon:'✧',description:a[2]});
 for(const a of Object.values(artifactDefinitions||{}))rows.push({id:a.id,name:a.name,category:'artifacts',type:'Артефакт',detail:`${a.rarity} · эффекты: ${Object.keys(a.effects).join(', ')}`,icon:'✧',description:a.desc});
 for(const x of [['tool_bolts','Болты','Полевой расходный материал для проверки подозрительных участков.'],['tool_dosimeter','Дозиметр','Прибор для контроля радиационного фона.'],['tool_flashlight','Фонарик','Источник света для исследования тёмных помещений.'],['tool_medkit','Полевой набор','Комплект вспомогательного оборудования для экспедиции.']])rows.push({id:x[0],name:x[1],category:'tools',type:'Полевое оборудование',detail:'Вспомогательное снаряжение',icon:'⚒',description:x[2]});
 return rows;
}
function renderArmory(){
 const g=getState();
 const q=($('armorySearch')?.value||'').trim().toLowerCase(),cl=$('armoryClass')?.value||'all';
 const list=armoryCatalog().filter(x=>(cl==='all'||x.category===cl)&&(x.name+' '+x.type+' '+x.detail+' '+x.description).toLowerCase().includes(q));
 const ownedById=new Map((g.items||[]).map(x=>[x.id,x]));
 const el=$('armoryList');if(!el)return;
 el.innerHTML=list.map(x=>{const owned=ownedById.get(x.id)||((x.category==='weapons')?g.items.find(i=>i.name===x.name):null);const discovered=x.category==='weapons'?g.discoveredWeapons?.includes(x.id):!!owned;return `<article class="armory-item-card"><div class="armory-item-icon">${escapeHtml(x.icon)}</div><div class="armory-item-copy"><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.type)} · ${escapeHtml(x.detail)}</small><p>${escapeHtml(x.description)}</p><span class="armory-item-state ${discovered?'found':''}">${owned?'В рюкзаке ×'+Number(owned.qty||1):discovered?'Обнаружено':'Справочная запись'}</span></div><div class="armory-item-meta">${x.price!=null?`<b>${Number(x.price).toLocaleString('ru-RU')} ₽</b>`:'<b>—</b>'}${x.weight!=null?`<small>${x.weight} кг</small>`:''}${owned?`<button type="button" onclick="view('inventory')">В рюкзак</button>`:''}</div></article>`}).join('')||'<div class="mutedbox">По этому запросу ничего не найдено.</div>';
 const count=$('encyclopediaCount');if(count)count.textContent=`АРСЕНАЛ · ${list.length} ПОЗИЦИЙ`;
}

    return Object.freeze({encyclopediaBase,selectEncyclopediaEntry,toggleEncyclopediaGroup,setEncyclopediaMode,renderEncyclopedia,armoryCatalog,renderArmory});
  }
  const api=Object.freeze({createEncyclopediaSystem});
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ZoneEncyclopedia=api;
})(typeof window!=='undefined'?window:globalThis);
