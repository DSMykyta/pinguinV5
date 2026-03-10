var e,t=["scroll","wheel","touchstart","touchmove","touchenter","touchend","touchleave","mouseout","mouseleave","mouseup","mousedown","mousemove","mouseenter","mousewheel","mouseover"];if(function(){var e=!1;try{var t=Object.defineProperty({},"passive",{get:function(){e=!0}});window.addEventListener("test",null,t),window.removeEventListener("test",null,t)}catch(e){}return e}()){var o=EventTarget.prototype.addEventListener;e=o,EventTarget.prototype.addEventListener=function(o,r,n){var s,a="object"==typeof n&&null!==n,i=a?n.capture:n;(n=a?function(e){var t=Object.getOwnPropertyDescriptor(e,"passive");return t&&!0!==t.writable&&void 0===t.set?Object.assign({},e):e}(n):{}).passive=void 0!==(s=n.passive)?s:-1!==t.indexOf(o)&&!0,n.capture=void 0!==i&&i,e.call(this,o,r,n)},EventTarget.prototype.addEventListener._original=e}

(function(exports, d) {
	
	function domReady(fn, context) {
		function onReady(event) {
		  d.removeEventListener("DOMContentLoaded", onReady);
		  fn.call(context || exports, event);
		}

		function onReadyIe(event) {
		  if (d.readyState === "complete") {
			d.detachEvent("onreadystatechange", onReadyIe);
			fn.call(context || exports, event);
		  }
		}

		d.addEventListener && d.addEventListener("DOMContentLoaded", onReady) ||
		d.attachEvent      && d.attachEvent("onreadystatechange", onReadyIe);
	}
	exports.domReady = domReady;
})(window, document);

class Factory {
	
	static v = {};
	
	static register(name, class_) {
		this.v[name] = class_;
	}

	static create(name, ...args) {
		
		let c = this.v[name];
		if (c == null || !(c instanceof Function)) {
			return null;
		}
		return new c(...args);
	}
}

class Tools {
	
	getWindowDims() {//визначення розмірів viewPort
		
		let doc = document, w = window;
		let docEl = (doc.compatMode && doc.compatMode === 'CSS1Compat')?
		doc.documentElement: doc.body;

		let width = docEl.clientWidth;
		let height = docEl.clientHeight;

		if (w.innerWidth && width > w.innerWidth) {// mobile zoomed in (?)
			width = w.innerWidth;
			height = w.innerHeight;
		}
		return {width: width, height: height};
	}
	
	JSONtoURLEncoded(element,key,list) {
		
		var self = this;
		var list = list || [];
		if(typeof(element)=="object") {
			for (var idx in element) {
				self.JSONtoURLEncoded(element[idx],key?key+'['+idx+']':idx,list);
			}
		} else {
			list.push(key+'='+encodeURIComponent(element));
		}
		return list.join('&');
		
	}

	documentReload(time) {
		
		if (time == undefined) {
			time = 100;
		}
		
		setTimeout (function() {
			document.location.reload(true);
			tools.scrollIt(0, 300);
		}, time);
		
	}
	
	documentTo(href) {

		window.location.replace(href);
		
	}
	
	transformStrToObj (str) {
		/*       discuss at: http://phpjs.org/functions/parse_str/
		      original by: Cagri Ekin
		      improved by: Michael White (http:getsprink.com)
		      improved by: Jack
		      improved by: Brett Zamir (http:brett-zamir.me)
		      bugfixed by: Onno Marsman
		      bugfixed by: Brett Zamir (http:brett-zamir.me)
		      bugfixed by: stag019
		      bugfixed by: Brett Zamir (http:brett-zamir.me)
		      bugfixed by: MIO_KODUKI (http:mio-koduki.blogspot.com/)
		 reimplemented by: stag019
		         input by: Dreamer
		         input by: Zaide (http:zaidesthings.com/)
		         input by: David Pesta (http:davidpesta.com/)
		         input by: jeicquest
		             note: When no argument is specified, will put variables in global scope.
		             note: When a particular argument has been passed, and the returned value is different parse_str of PHP. For example, a=b=c&d====c
		            test: skip
		        example 1: var arr = {};
		       example 1: parse_str('first=foo&second=bar', arr);
		        example 1: $result = arr
		        returns 1: { first: 'foo', second: 'bar' }
		        example 2: var arr = {};
		        example 2: parse_str('str_a=Jack+and+Jill+didn%27t+see+the+well.', arr);
		        example 2: $result = arr
		        returns 2: { str_a: "Jack and Jill didn't see the well." }
		       example 3: var abc = {3:'a'};
		        example 3: parse_str('abc[a][b]["c"]=def&abc[q]=t+5');
		        returns 3: {"3":"a","a":{"b":{"c":"def"}},"q":"t 5"}*/

		var strArr = String(str)
		.replace(/^&/, '')
		.replace(/&$/, '')
		.split('&'),
		sal = strArr.length,
		i, j, ct, p, lastObj, obj, lastIter, undef, chr, tmp, key, value,
		postLeftBracketPos, keys, keysLen,
		fixStr = function (str) {
			return decodeURIComponent(str.replace(/\+/g, '%20'));
		};

		var array = {};
		for (i = 0; i < sal; i++) {
			tmp = strArr[i].split('=');
			key = fixStr(tmp[0]);
			value = (tmp.length < 2) ? '' : fixStr(tmp[1]);

			while (key.charAt(0) === ' ') {
				key = key.slice(1);
			}
			
			if (key.indexOf('\x00') > -1) {
				key = key.slice(0, key.indexOf('\x00'));
			}
			
			if (key && key.charAt(0) !== '[') {
				keys = [];
				postLeftBracketPos = 0;
				for (j = 0; j < key.length; j++) {
					if (key.charAt(j) === '[' && !postLeftBracketPos) {
						postLeftBracketPos = j + 1;
					} else if (key.charAt(j) === ']') {
						if (postLeftBracketPos) {
							if (!keys.length) {
								keys.push(key.slice(0, postLeftBracketPos - 1));
							}
							keys.push(key.substr(postLeftBracketPos, j - postLeftBracketPos));
							postLeftBracketPos = 0;
							if (key.charAt(j + 1) !== '[') {
								break;
							}
						}
					}
				}
				if (!keys.length) {
					keys = [key];
				}
				for (j = 0; j < keys[0].length; j++) {
					chr = keys[0].charAt(j);
					if (chr === ' ' || chr === '.' || chr === '[') {
						keys[0] = keys[0].substr(0, j) + '_' + keys[0].substr(j + 1);
					}
					if (chr === '[') {
						break;
					}
				}

				obj = array;
				for (j = 0, keysLen = keys.length; j < keysLen; j++) {
					key = keys[j].replace(/^['"]/, '')
					.replace(/['"]$/, '');
					lastIter = j !== keys.length - 1;
					lastObj = obj;
					if ((key !== '' && key !== ' ') || j === 0) {
						if (obj[key] === undef) {
							obj[key] = {};
						}
						obj = obj[key];
					} else {
						// To insert new dimension
						ct = -1;
						for (p in obj) {
							if (obj.hasOwnProperty(p)) {
								if (+p > ct && p.match(/^\d+$/g)) {
									ct = +p;
								}
							}
						}
						key = ct + 1;
					}
				}
				lastObj[key] = value;
			}
		}
		return array;
	}

	transformObjToStr (obj, prefix){
		var str = [],p;
		var glue1 = '=';
		var glue2 = '&';
		var self = this;
		for(p in obj) {
			if(obj.hasOwnProperty(p)) {
				var k = prefix ? prefix + "[" + p + "]" : p,
				v = obj[p];
				str.push(
					(v !== null && typeof v === "object") ?
					self.transformObjToStr(v, k) :
					encodeURIComponent(k) + glue1 + encodeURIComponent(v)
				);
			}
		}
		return str.join(glue2);
	}
	
	consoleLog (msg, toNode) {
		//See /questions/62483/how-can-i-determine-the-current-line-number-in-javascript/430713#430713470749
		var e = new Error();
		if (!e.stack)
		try {
			// IE requires the Error to actually be thrown or else the
			// Error 'stack' property is undefined.
			throw e;
		} catch (e) {
			if (!e.stack) {
			//return 0; // IE < 10, likely
			}
		}
		var stack = e.stack.toString().split(/\r\n|\n/);
		if (msg === '') {
			msg = '""';
		}

		if(toNode == undefined){
			console.log(msg, '  [' + stack[1] + ']');
		} else {
			//console.log(JSON.stringify(msg));
			//document.querySelector(toNode).innerHTML = JSON.stringify(msg);
		}
		
	}
	
	getHiddenElementHeight(o) {
		
		// Клонуємо елемент
		const clone = o.cloneNode(true);
		let oAttach = document.body;
		
		// Встановлюємо стилі, щоб елемент був невидимим для користувача
		clone.style.display = "block";
		clone.style.visibility = "hidden";
		clone.style.position = "absolute";
		clone.style.left = "-9999px";
		clone.style.maxHeight = "unset";

		// Додаємо клон до DOM

		oAttach.appendChild(clone);

		// Отримуємо висоту
		const height = clone.offsetHeight;

		// Видаляємо клон
		oAttach.removeChild(clone);

		return height;
	}
	
	tabsInit(inPlace) {
		
		let tabs = [], header, body, headerList, bodyList, i, j, ij, index, dataID, div, height;

		if (inPlace != undefined) {//якщо передали об'єкт
			tabs[0] = inPlace;
		} else {
			tabs = document.querySelectorAll(".tabs");
		} 

		if (tabs) {

			header = [];
			body = [];
			
			for (i = 0; i < tabs.length; i++) {
				
				header[i] = tabs[i].querySelectorAll(":scope > .header > *");
				body[i] = tabs[i].querySelector(".body").querySelectorAll(":scope > div");
				
				for (j = 0; j < header[i].length; j++) {

					//console.log(body[j]);
					/*if (body[j].classList.contains("show")) {
						body[j].style.maxHeight = body[j].scrollHeight+"px";
					}*/
					
					header[i][j].addEventListener("click", function(e) {

						if (
							e.target.classList.contains("show")
						) {
							return;
						}

						headerList = Array.from(e.target.closest(".header").children);
						bodyList = Array.from(e.target.closest(".header").nextElementSibling.children);

						if (
							headerList.length != bodyList.length
						) {//перевірка на однакову кількість елементів
							return;
						}

						index = headerList.indexOf(e.target);

						if (index !== -1) {//знайшли відповідний .body > div

							for (ij = 0; ij < headerList.length; ij++) {//пробігаємся по списку  заголовків

								if (
									headerList[ij] == e.target
								) {//це поточний

									if (
										!headerList[ij].classList.contains("show")
									) {//треба показати

										dataID = e.target.getAttribute("data-id");
										if (
											dataID
											&& headerList[ij].getAttribute("data-hash")
										) {//блок має data-id і треба — встановлюємо в hash

											document.location.hash = tools.transformObjToStr({"tab" : dataID}) 
										}
										
										/*bodyList[ij].style.maxHeight = bodyList[ij].scrollHeight+"px";*/
										headerList[ij].classList.add("show");
										bodyList[ij].classList.add("show");

									} else {//треба сховати
										/*bodyList[ij].style.maxHeight = 0;*/
										headerList[ij].classList.remove("show");
										bodyList[ij].classList.remove("show");
									}

								} else {//це не поточний
									/*bodyList[ij].style.maxHeight = 0;*/
									headerList[ij].classList.remove("show");
									bodyList[ij].classList.remove("show");
								}
							}

						}
					});
				}
			}
		}
	}
	
	accordionInit(inPlace) {

		let accordion = [], section, sectionCurrent, body, sectionList, i, j, ij, header, height;

		if (inPlace != undefined) {//якщо передали об'єкт
			accordion[0] = inPlace;
		} else {
			accordion = document.querySelectorAll(".accordion");
		} 

		if (accordion) {

			section = [];

			for (i = 0; i < accordion.length; i++) {
				
				section[i] = accordion[i].querySelectorAll(":scope > div");

				for (j = 0; j < section[i].length; j++) {
					
					header = section[i][j].querySelector("div.header");
					
					if (header) {
						
						/*if (section[i][j].classList.contains("show")) {
						
							section[i][j].querySelector("div.body").style.maxHeight = section[i][j].querySelector("div.body").scrollHeight+"px";

						}*/
						
						header.addEventListener("click", function(e) {

							sectionList = Array.from(e.target.closest(".accordion").children);
							sectionCurrent = e.target.closest(".accordion > div");
							
							for (ij = 0; ij < sectionList.length; ij++) {
								
								body = sectionList[ij].querySelector("div.body");
								if (
									sectionCurrent == sectionList[ij]
								) {//проходимо поточну секцію

									if (
										!sectionList[ij].classList.contains("show")
									) {//треба показати
										
										/*body.style.maxHeight = body.scrollHeight+"px";*/
										sectionList[ij].classList.add("show");
									} else {//треба сховати
	
										/*body.style.maxHeight = 0;*/
										sectionList[ij].classList.remove("show");
									}

								} else {//не поточна — закриваємо

									/*body.style.maxHeight = 0;*/
									sectionList[ij].classList.remove("show");

								}
							}

						});
					}
				}

				if (
					inPlace != undefined
					&& accordion.length == 1
					) {//якщо передали об'єкт

						accordion[0].removeAttribute("onclick");
				}
			}
		}
	}
	
	spoilerInit(inPlace) {

		let spoiler = [], header, i, index, div, className, height;

		if (inPlace != undefined) {//якщо передали об'єкт
			
			className = inPlace.getAttribute('class');
			if (className == "layers") {
				spoiler = inPlace.querySelectorAll(".spoiler");
			} else {
				spoiler[0] = inPlace;
			}

		} else {
			spoiler = document.querySelectorAll(".spoiler");
		} 

		if (spoiler) {

			for (i = 0; i < spoiler.length; i++) {
				
				header = spoiler[i].querySelector(".header");

				if (header) {
					// Видаляємо попереднього слухача, якщо він існує
					header.removeEventListener("click", tools.handleSpoilerClick);
					// Додаємо нового слухача
					header.addEventListener("click", tools.handleSpoilerClick);
				}
			}
		}
	}
	
	handleSpoilerClick(e) {
		const div = e.target.closest(".spoiler");
		
		if (div) {
			if (!div.classList.contains("show")) {
				div.classList.add("show");
			} else {
				div.classList.remove("show");
			}
		}
	}
	
	getOffset(elem) {
		
		/*https://javascript.ru/ui/offset*/
		
		if (elem.getBoundingClientRect) {
			// "правильный" вариант
			return tools.getOffsetRect(elem);
		} else {
			// пусть работает хоть как-то
			return tools.getOffsetSum(elem);
		}
	}
	
	getOffsetSum(elem) {
		var top=0, left=0;
		while(elem) {
			top = top + parseInt(elem.offsetTop);
			left = left + parseInt(elem.offsetLeft);
			elem = elem.offsetParent;
		}

		return {top: top, left: left};
	}

	getOffsetRect(elem) {
		// (1)
		let r = {};
		
		if (elem) {
			var box = elem.getBoundingClientRect();

			// (2)
			var body = document.body;
			var docElem = document.documentElement;

			// (3)
			var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
			var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;

			// (4)
			var clientTop = docElem.clientTop || body.clientTop || 0;
			var clientLeft = docElem.clientLeft || body.clientLeft || 0;

			// (5)
			var top  = box.top +  scrollTop - clientTop;
			var left = box.left + scrollLeft - clientLeft;
			
			r  = {
					top: Math.round(top),
					left: Math.round(left),
					width: box.width,
					height: box.height
			};
		}
		
		return r;
	}
	
	scrollIt(destination, duration = 200, minus = 0, easing = 'linear', callback) {

		/*https://pawelgrzybek.com/page-scroll-in-vanilla-javascript/*/
		
		const easings = {
			linear(t) {
				return t;
			},
			easeInQuad(t) {
				return t * t;
			},
			easeOutQuad(t) {
				return t * (2 - t);
			},
			easeInOutQuad(t) {
				return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
			},
			easeInCubic(t) {
				return t * t * t;
			},
			easeOutCubic(t) {
				return (--t) * t * t + 1;
			},
			easeInOutCubic(t) {
				return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
			},
			easeInQuart(t) {
				return t * t * t * t;
			},
			easeOutQuart(t) {
				return 1 - (--t) * t * t * t;
			},
			easeInOutQuart(t) {
				return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
			},
			easeInQuint(t) {
				return t * t * t * t * t;
			},
			easeOutQuint(t) {
				return 1 + (--t) * t * t * t * t;
			},
			easeInOutQuint(t) {
				return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t;
			}
		};

		const start = window.pageYOffset;
		const startTime = 'now' in window.performance ? performance.now() : new Date().getTime();

		const documentHeight = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
		
		const windowHeight = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;
		
		const destinationOffset = typeof destination === 'number' ? destination : tools.getOffset(destination)["top"] - minus;

		const destinationOffsetToScroll = Math.round(documentHeight - destinationOffset < windowHeight ? documentHeight - windowHeight : destinationOffset) - minus;
		
		/*console.log(typeof destination);
		console.log("destinationOffset: " + destinationOffset);
		console.log("destinationOffsetToScroll: " + destinationOffsetToScroll);*/
		
		if ('requestAnimationFrame' in window === false) {
			window.scroll(0, destinationOffsetToScroll);
			if (callback) {
				callback();
			}
			return;
		}

		function scroll() {

			const now = 'now' in window.performance ? performance.now() : new Date().getTime();
			const time = Math.min(1, ((now - startTime) / duration));
			const timeFunction = easings[easing](time);
			window.scroll(0, Math.ceil((timeFunction * (destinationOffsetToScroll - start)) + start));

			if (window.pageYOffset === destinationOffsetToScroll) {
				if (callback) {
					callback();
				}
				return;
			}

			requestAnimationFrame(scroll);
		}

		scroll();
	}
	
	work(type, o, time) {
		
		if (
			o == undefined
			|| o.tagName == undefined
		) {
			o = document.documentElement;/*html*/
		}

		if (type === 0) {//end

			if (time == undefined) {
				time = 50;
			}

			setTimeout (function() {
				o.classList.remove("work");
			}, time);

		} else {//start, 1

			o.classList.add("work");
			
		}
		
	}
	
	clearNotNumberValue(o) {
		
		var iNumberValue = parseInt(o.value);
		if (isNaN (iNumberValue)){
			o.value = "";
		}
	}
	
	toTopInit(o, top) {
		
		if (o) {

			window.onscroll = function() {

				if (top == undefined) {
					var top = 200;
				}
				
				/*var header = document.querySelector("header");*/
				var header = document.querySelector("body");
				
				if (
					document.body.scrollTop > top
					|| document.documentElement.scrollTop > top
				) {
					o.classList.add("show");
					if (header) {
						header.classList.add("scroll");
					}
				} else {
					o.classList.remove("show");
					if (header) {
						header.classList.remove("scroll");
					}
				}
			}
		}
	}
	
	toTop (o) {//клік по кнопці

		tools.scrollIt(0, 300);

	}

	navMenuInit(clickOutsideCheck, toggleElems, toolsMethod) {
		
		var ch = document.querySelectorAll("nav.tm > div input[type=checkbox]");
		
		if (ch) {
			
			for (let i = 0; i < ch.length; i++) {
				
				ch[i].addEventListener("click", function(e) {
					
					if (e.target.checked) {//по ньому клікнули

						for (var j in ch) {
							
							if (!isNaN(j) && ch[j] != e.target) {//крім себе
								ch[j].checked=false;
							}
							
						}
						
					}
					
				});
				
			}
			
		}
		
		if (
			clickOutsideCheck == undefined
			|| clickOutsideCheck == "undefined"
		) {
			clickOutsideCheck = false;
		}

		if (clickOutsideCheck) {

			document.querySelector("body").addEventListener("click", function(e){

				let clickByMenuEl = false;
				let path = e.composedPath();
				let menuEl = document.querySelector("nav.tm");//перший зверху елемент, клік по якому відсліджуємо
				let menuChecked = document.querySelector("nav.tm input[type=checkbox]:checked");
				
				//console.log(menuChecked);return false;
				
				if (menuEl) {
					
					for (let i = 0; i < path.length; i++) {
						
						if (path[i] === menuEl) {
							
							clickByMenuEl = true;
							break;
							
						}
						
					}
					
					if (!clickByMenuEl && menuChecked) {//клік за межами меню
						
						//console.log("клік за межами відкритого меню");
						menuChecked.checked = false;
						
					}
				}
				
			});
		}

		if (
			Array.isArray(toggleElems)
		) {

			var checkbox0 = document.getElementById(toggleElems[0]); 
			var checkbox1 = document.getElementById(toggleElems[1]);
			
			if (
				checkbox0
				&& checkbox1
			) {
				
				checkbox0.addEventListener("click", function(e) {
					
					if (e.target.checked){//відкривається меню
						
						if (checkbox1.checked) {
							
							checkbox1.checked = false;
							
						}
					}
					
				});
			}
		}

		if (
			toolsMethod != undefined
			&& tools[toolsMethod] != undefined
		) {

			tools[toolsMethod]();
		}

	}
	
	playVideo (o) {
		
		var href= o.getAttribute("href");
		if (href) {
			var tmp = href.split ("/");//выкусываем ID
			if (tmp[(tmp.length-1)] != undefined) {
				href = "https://www.youtube.com/embed/"+tmp[(tmp.length-1)];
			}
			var div = document.createElement("div");
			div.classList.add("video");
			
			var iframe = document.createElement("iframe");
			
			iframe = tools.setAttr (iframe,{
				src				:	href+"?autoplay=1",
				frameborder		:	0,
				width			:	"100%",
				allowfullscreen	:	"",
				allow			:	"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
			});
			div.appendChild(iframe);
			
			if (o.getAttribute("data-target")) {
				switch (o.getAttribute("data-target")) {
					case "toModal":
						alert("toModal ({Nodes:div})");
					break;
				}
			} else {
				o.replaceWith(div);
			}
		}
	}

	setAttr(control,Attr) {
		for (var key in Attr) {
			control.setAttribute(key, Attr[key]);
		}
		return control;
	}
	
	capitalize(str) {
		if (!str) return str;
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
	
	lowercaseFirst(str) {
		if (!str) return str;
		return str.charAt(0).toLowerCase() + str.substring(1);
	}
	
	toClipboard(string, replaced=false) {
		
		if (replaced) {
			string = string.replace(/\*/g, '"');
		}

		var clpb = document.createElement("input");
		clpb.id = "tmp-clpb";
		clpb.value = string;
		document.body.append(clpb);
		clpb.select();
		
		if(document.execCommand("copy")){
			vNotify.success({text: "Copy Ok",visibleDuration:1000,showClose:false});
		} else {
			vNotify.error({text: "Copy Error",visibleDuration:1000,showClose:false});
		}
		document.getElementById("tmp-clpb").remove();
	}

	toModal (p) {
		
		if (!p?.["target"]) { p["target"] = 1; }
		
		var titleE = document.getElementById("modal-"+p["target"]+"-title");
		titleE.innerHTML = p["header"] ? p["header"] : "";

		var contentE = document.getElementById("modal-"+p["target"]+"-content");
		var html = p["html"];

		contentE.innerHTML = html;
		
		MicroModal.show("modal-"+p["target"]);
		
	}
	
	str_replace ( search, replace, subject ) {	// Replace all occurrences of the search string with the replacement string
		// 
		// +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   improved by: Gabriel Paderni

		if(!(replace instanceof Array)){
			replace=new Array(replace);
			if(search instanceof Array){//If search	is an array and replace	is a string, then this replacement string is used for every value of search
				while(search.length>replace.length){
					replace[replace.length]=replace[0];
				}
			}
		}

		if(!(search instanceof Array))search=new Array(search);
		while(search.length>replace.length){//If replace	has fewer values than search , then an empty string is used for the rest of replacement values
			replace[replace.length]='';
		}

		if(subject instanceof Array){//If subject is an array, then the search and replace is performed with every entry of subject , and the return value is an array as well.
			for(k in subject){
				subject[k]=str_replace(search,replace,subject[k]);
			}
			return subject;
		}

		for(var k=0; k<search.length; k++){
			var i = subject.indexOf(search[k]);
			while(i>-1){
				subject = subject.replace(search[k], replace[k]);
				i = subject.indexOf(search[k],i);
			}
		}

		return subject;
	}
	
	generatePassword(length, chars) {
		
		if (length == undefined) {
			
			var length = 12;
			
		}
		
		if (chars == undefined) {
			var chars = "!;%:?*()_+=-~/\<>,.[]{}1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
		}

		var res="";
		var r;
		var i;
		for (i=1;i<=length;i++) {
			r=Math.floor(Math.random()*chars.length);
			res=res+chars.substring(r,r+1);
		}
		return res;
	}
	
	setCookieRefererForm(formID) {
		
		let form = document.getElementById(formID);
		
		if (form) {
			let fieldReferer = form.querySelector("[name='referer']");
			
			if (fieldReferer) {
				fieldReferer.value = tools.getCookie("referer");
			}
		}
	}
	
	getCookie(name) {
		let matches = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
		return matches ? decodeURIComponent(matches[1]) : null;
	}
		
	spanToEmailInit() {
		
		var spanEmail = document.querySelectorAll("span.email");
		
		if (spanEmail) {
			for (var i in spanEmail) {
				
				if (typeof (spanEmail[i]) == "object") {
					
					let text = tools.strrev (spanEmail[i].textContent);
					spanEmail[i].innerHTML = "<a href='mailto:" + text + "' class='email'>" + text + "</a>";
					spanEmail[i].classList.remove("email");
					//spanEmail[i].replaceWith = "<a href='mailto:" + text + "' class='email'>" + text + "</a>";
					
				}

			}
		}
	}
	
	base64Init() {
		
		let base64 = document.querySelectorAll(".base64");
		
		if (base64 && base64.length) {

			let htmlBlock = document.querySelector("html");
			htmlBlock.classList.add("work");
			
			for (let i in base64) {
				
				if (typeof (base64[i]) == "object") {
					
					let text = atob(base64[i].textContent.trim());
					
					base64[i].innerHTML = text;
					base64[i].classList.remove("base64");
					
				}

			}
		
			setTimeout (function() {
				htmlBlock.classList.remove("work");
			}, 500);
			
		}
	}
	
	strrev(string) {// Reverse a string
		
		var ret = "", i = 0;
		for ( i = string.length-1; i >= 0; i-- ) {
			
			ret += string.charAt(i);
			
		}
		return ret;
	}
	
	submitDataForm(o) {
	
		var formBlock = o.closest("[data-type='form']");
		
		if (formBlock) {

			var args = formBlock.getAttribute("data-action");
			
			if (args) {

				args = tools.transformStrToObj(args);
				args["a"]["work"] = 1;
				args["data"] = form.returnData(formBlock);
				
				var className = tools.capitalize(args["h"]);
				var classReady = Factory.create(className);
				
				if (classReady) {
					
					classReady.go(args, o);
					
				} else {
					
					vNotify.error({text: library.get("Class") +" "+ className + " " + library.get("Not Found"),visibleDuration:10000});
					
				}
			}
		}
	}
	
	tracker = {
		/*https://highload.today/user-timing-v-html5/*/
		start: function(name) {

			window.performance.mark(name + ' start');

		},

		end: function(name) {

			window.performance.mark(name + ' end');

		},

		measure: function(name) {

			window.performance.measure(name + ' measure', name + ' start', name + ' end');

			return window.performance.getEntriesByName(name + ' measure')[0];

		}

	}

	addTo(o, type, ID, delItemBlock) {
	
		let lang = document.querySelector("html").getAttribute("data-lang");
		
		if (delItemBlock == undefined) {
			delItemBlock = 0;
		}
		
		let args = {
			h	:	"ajax",
			a	:	{
				"name"	:	"addTo",
				"work"	:	1
			},
			p	:	{
				"lang"			:	lang,
				"type"			:	type,
				"ID"			:	ID,
				"action"		:	o.getAttribute("data-action"),
				'delItemBlock'	:	delItemBlock
			}
		};
		
		ajax.start(args, o).then(
			
			function(d) {

				d = ajax.end(d, o, 100);
				js.addTo(d, o);

			}
		);
		
	}
	
	http_build_query(formdata, numeric_prefix, arg_separator) {
			// Generate URL-encoded query string
		// 
		// +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   improved by: Legaev Andrey
		// +   improved by: Michael White (http://crestidg.com)

		var key, use_val, use_key, i = 0, tmp_arr = [];

		if(!arg_separator){
			arg_separator = '&';
		}

		for(key in formdata){
			use_key = escape(key);
			use_val = escape((formdata[key].toString()));
			use_val = use_val.replace(/%20/g, '+');

			if(numeric_prefix && !isNaN(key)){
				use_key = numeric_prefix + i;
			}
			tmp_arr[i] = use_key + '=' + use_val;
			i++;
		}

		return tmp_arr.join(arg_separator);
	}
	
	closeModal(id) {

		MicroModal.close(id);
	}

	scrollToTopErrorBlock(selector) {
		tools.scrollIt(selector, 200, 100);
	}

	autocompleteClear(o) {
		/*Нічого не робимо за замовчуванням*/
	}

	passwordTypeChange(o) {
		
		let input = o.previousElementSibling;
		
		if (
			input
		) {

			let btnClass;
			let type = input.getAttribute("type");
			
			switch (type) {
				
				case "password":
					btnClass =  o.getAttribute("data-class-text");
					input.setAttribute("type", "text");
				break;
				
				case "text":
					btnClass =  o.getAttribute("data-class-password");
					input.setAttribute("type", "password");
				break;
				
			}
			o.setAttribute("class", btnClass);
		}
	}

	notify(d) {

		if (
			d?.["success"]
			&& d?.["text"]
		) {
			if (
				d["success"]
			) {
				vNotify.info({text: d["text"], visibleDuration: 5000, position	: "center"});
			} else {
				vNotify.error({text: d["text"],visibleDuration:5000, position	: "center"});
			}
		}
	}
	
	explode(str, separator, limit) {

		let index = str.indexOf(separator);
		return [str.slice(0, index), str.slice(index + (limit - 1))];
	}
	
	getAllParents(node) {
		const parents = [];
		let currentNode = node;

		while (currentNode && currentNode !== document) {
			parents.push(currentNode.parentNode);
			currentNode = currentNode.parentNode;
		}

		return parents;
	}
	
	replaceQuotesToEntities(text) {
		return text
			.replace(/'/g, '&apos;') // Заміна одинарних лапок
			.replace(/"/g, '&quot;'); // Заміна подвійних лапок
	}
}

class Ajax {
	
	go(args, o, action) {

		tools.work(1);
		ajax.start(args, o).then(

			function(d) {
				
				d = ajax.end(d, o); tools.work(0);
				
				if (d) {
					
					let showTime;
					if (d["info"]["success"]) {
						
						if (d["info"]["text"] != undefined) {

							showTime = d["info"]["showTime"] ?? 1000;
							vNotify.info({text: d["info"]["text"],visibleDuration:showTime,showClose:false});
						}
						
					} else {
						
						if (d["info"]["text"] != undefined) {
							
							showTime = d["info"]["showTime"] ?? 10000;
							vNotify.error({text: d["info"]["text"],visibleDuration:showTime});
							
						}
					}
					
					if (action != undefined) {//команда з JS

						var readyClass = Factory.create(action["class"]);
						
						if(readyClass) {
							if(readyClass[action["method"]] == undefined) {
								vNotify.error({text: "JS "+action["class"]+"::"+action["method"]+library.get("Not Found"),visibleDuration:10000});
							} else {
								readyClass[action["method"]](args, o, d);
							}
						} else {
							vNotify.error({text: "JS class:"+action["class"]+" "+library.get("Not Found"),visibleDuration:10000});
						}
					}
					
					if (d["action"] != undefined) {//команда з PHP
						var tmp = Object.keys(d["action"])[0].split("::");

						if (
							tmp[1] != undefined
						) {//class::method
							
							let factory = Factory.create(tmp[0]);
							if (
								typeof factory == "object"
								&& typeof factory[tmp[1]] != "undefined"
							) {

								factory[tmp[1]](Object.values(d["action"])[0], o);
							}

						}
					}
				}
			}
		);
	}
	
	promice(url, options) {
		return new Promise(function (resolve, reject) {
			ajax.ajaxCallback(url, resolve, reject, options);
		});
	}
	
	ajaxCallback(url, resolve, reject, options) {
		
		var xmlHttp = new XMLHttpRequest();

		xmlHttp.onreadystatechange = function () {
			var result;
			if (xmlHttp.readyState == 4) {
				if (xmlHttp.status == 200) {
					switch(options.dataType) {
						case 'xml':
							result = xmlHttp.responseXML;
						break;

						default:
							result = xmlHttp.responseText;
						break;
					}
					resolve(result);
				} else if (reject) {
					reject('Ajax error: ' + xmlHttp.status);
				}
			}
		};
		
		xmlHttp.open(options.method || 'GET', url, true);
		
		if (options.headers) {
			for (var key in options.headers) {
				xmlHttp.setRequestHeader(key, options.headers[key]);
			}
		}
		xmlHttp.send(options.data || '');
	}
	
	start(args, o) {//початок асинхронного запиту

		return ajax.promice(
			"/p/ajax",{
				method		:	"POST",
				dataType	:	"json",
				data		:	tools.JSONtoURLEncoded(args),
				headers		:	{
					"X-Requested-With"	:	"XMLHttpRequest",
					"Content-Type"		:	"application/x-www-form-urlencoded; charset=UTF-8"
				}
			}
		);
	}
	
	end(d) {//кінець асинхронного запиту

		if (d === undefined || d === null || d == "null") {
			return false;
		}
		
		try {
			d = JSON.parse(d);
		} catch (error) {
			console.error('Error parsing JSON:', error.message);
		}

		return d;
	}
	
	sync(args, o) {//синхронний запит
		
		let xhr = new XMLHttpRequest();
		xhr.open("POST", "/p/ajax", false);
		
		xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");

		try {
			
			xhr.send(tools.JSONtoURLEncoded(args));
			
			if (xhr.status == 200) {
				
				return JSON.parse(xhr.responseText);

			}
			
		} catch(err) { // для оброки помилок використовуємо try...catch замість події onerror
			
			return null;
			
		}
	}

}

class Library {

	language = 0;
	
	getLanguage() {
		
		return library.language;
		
	}
	
	setLanguage(language) {

		library.language = language;
		
	}
	
	get(name) {
		if (typeof dLibrary == "undefined" || dLibrary?.[name]?.[library.getLanguage()] == undefined) {
			
			return name;
			
		}
		
		return dLibrary[name][library.getLanguage()];
	}
}

Factory.register("Tools", Tools);tools = Factory.create("Tools");//all
Factory.register("Ajax", Ajax);ajax = Factory.create("Ajax");
Factory.register("Library", Library); library = Factory.create("Library");

/*tools.tracker.start("run");*/
class Form {
	
	go(o, action) {

		o.querySelector("[type='submit'], button:not([type])").disabled = true;/*забороняємо відправку форми*/
		
		let inputs = form.setInputs(o);/*отримали елементи форми з [name]*/

		if (inputs) {

			let data = form.getDataInputs(inputs);

			form.setFormDynamicValid(data, o);/*встановили динамічну валідацію полів*/
			
			if (form.validateDataInputs(data, o)) {//валідація пройшла успішно

				var args = o.getAttribute("action");

				if (args) {

					let validateAfter = o.getAttribute("data-validate-after");

					if (validateAfter) {
						
						o.removeAttribute("data-validate-after");
						validateAfter = validateAfter.split(" ");
						
						if (validateAfter.length) {
							
							let classReady;
							let tmp;

							for (let j = 0; j < validateAfter.length; j++) {

								tmp = validateAfter[j].trim().split("::");
								
								if (tmp?.[1]) {

									classReady = Factory.create(tmp[0]);

									if (classReady) {

										if (tmp[1] in classReady) {
											
											classReady[tmp[1]](o, data);

										}
									}
								}
							}
						}
					}
					
					args = tools.transformStrToObj(args);

					args["a"]["language"] = document.querySelector("html").getAttribute("data-lang");
					args["data"] = form.selectFieldsFromData(data);

					var className = tools.capitalize(args["h"]);
					var classReady = Factory.create(className);

					if (classReady) {

						if (className == "Ajax") {
							args["data"]["referrer"] = document.referrer;
						}
						
						classReady.go(args, o, action);
						
					} else {
						
						vNotify.error({text: library.get("Class") +" "+ className + " " + library.get("Not Found"),visibleDuration:10000});
						
					}
					
					o.querySelector("[type='submit'],button:not([type])").disabled = false;/*дозволяємо знову відправку форми*/
				}
			} else {

				o.querySelector("[type='submit'],button:not([type])").disabled = false;/*дозволяємо знову відправку форми*/

				if (
					o.querySelector(".block.error")
					&& o.parentElement.tagName != "MAIN"
				) {/*скролимо, крім випадку, коли форма в модалі*/

					//tools.scrollIt(o.querySelector(".block.error"), 200, 100);
					tools.scrollToTopErrorBlock(o.querySelector(".block.error"));//обгортка для управління скроллом, якщо хедер sticked
					//console.log(o.querySelector(".block.error"));
					/*скрол до верхнього невалідного .block.error*/
				}
			}
		}
	}
	
	setInputs (o) {
		
		if(o.tagName != undefined) {
			
			switch (o.tagName) {
				
				case "FORM":
				
					var inputs = o.querySelectorAll("input[name], select[name], textarea[name]");//елементи форми
					
				break;
				
				default:
				
					//inputs = o.querySelectorAll("input[data-name], select[data-name], textarea[data-name]");//елементи псевдоформи
					
					var inputsPre = o.querySelectorAll("input[data-name], select[data-name], textarea[data-name]");//елементи псевдоформи

					if (inputsPre) {

						var inputs = new Array();
						inputsPre = Array.from(inputsPre);

						for (let i = 0; i < inputsPre.length; i++) {
						
							if (inputsPre[i].closest("[data-type='form']") == o) {//тільки своєї форми
								
								inputs.push(inputsPre[i]);

							}
						}
					}
					
			}

			return inputs;
		}
	}
	
	returnData (o) {
		
		var data = null;
		var inputs = form.setInputs(o);

		if (inputs) {
			
			var data = form.getDataInputs(inputs, "data-name");
			
			if (form.validateDataInputs(data, o)) {//валідація пройшла успішно
				
				data = form.selectFieldsFromData(data, o);
				
			} else {//валідація не пройдена
				
				return null;
			}
			
		}
		
		return data;
	}
	
	selectFieldsFromData(data, o) {
		
		let args = {};
		let dataCheckbox = null;
		
		if (o != undefined) {
			dataCheckbox = o.getAttribute("data-checkbox");
		}

		for (let name in data) {
			
			switch (dataCheckbox) {
				
				case "checkedOnly"://дерево
				
					if (data[name]["el"].getAttribute("type") == "checkbox") {
					
						if (data[name]["value"]) {//тільки чекані 
							args[name] = data[name]["value"];
						}
					
					} else {
						args[name] = data[name]["value"];
					}
					
				break;
				
				default:
					args[name] = data[name]["value"];
			}

		}

		return args;
		
	}
	
	getDataInputs(inputs, attrAsName) {
		
		if (attrAsName == undefined) {
			attrAsName = "name";
		}
		var data = {};//всі елементи форми
		var name, dataEl;
		//console.log(inputs);
		for (let i = 0; i < inputs.length; i++) {
			
			name = inputs[i].getAttribute(attrAsName);
			
			if (name) {//наявність назви поля обов'язкова;

				dataEl = form.getDataInput(inputs[i]);
				//console.log(dataEl);
				if (dataEl.value !== null) {
					
					data[name] = dataEl;
					
				}
			}
		}

		return data;
	}
	
	getDataInput(input) {
		
		var data = {};//один елемент форми
		data["el"] = input;

		switch (input.tagName){
			case "INPUT":
				switch (input.type){
					case "checkbox":
						if (input.checked) {
							data["value"] = 1;
						} else {
							data["value"] = 0;
						}
					break;
					
					case "radio":
						if (input.checked) {
							if (input.value != undefined && input.value != "on") {
								data["value"] = input.value;
							} else {//просто отмеченный без value
								data["value"] = 1;
							}
						} else {
							data["value"] = null;//для групи radio
						}
					break;
					
					default:
						data["value"] = input.value;
				}
				
			break;
			
			case "SELECT":
				if (input.multiple) {
					var selected = [];
					for (var j = 0; j < input.options.length; j++) {
						if(input.options[j].selected) {
							selected.push(input.options[j].value);
						}
					}
					data["value"] = selected.join(",");
				} else {
					data["value"] = input.value;
				}
			break;
			
			default:
				data["value"] = input.value;
		}
		
		var dataValid = input.getAttribute("data-valid");
		if (dataValid) {
			data["valid"] = dataValid.trim().split(" ");
		}
		
		var dataReaction = input.getAttribute("data-reaction");
		if (dataReaction) {
			data["reaction"] = dataReaction.trim().split(" ");
		}

		return data;
	}

	validateDataInputs(data, formO) {

		var formValidation = true;
		var r;

		for (let name in data) {
			
			if (data[name]["valid"] != undefined) {
				
				r = valid.start(data[name]);
				
				if (!r) {//аби лише один невалідний
					
					formValidation = false;
					
				}
				
			}
			
		}

		if (formValidation === false) {//валідація не пройдена

			var o = formO.querySelector(".block.error .error");//знаходимо верхній невалідний елемент

			/*if (typeof runTools != undefined) { runTools.playAudio("error"); } дивна історія, на фронті видає помилку*/

			if (o) {//знайшли

				switch (o.tagName) {
					
					case "SELECT":
						o.focus();
					break;
					
					default:
						o.select();
						
				}
				var tab = o.closest(".accordion .tab");
				
				if (tab) {

					var tabLabel = tab.previousElementSibling;
					
					if (tabLabel) {
						
						var tabCheckbox = tabLabel.previousElementSibling;

						if (tabCheckbox.checked === false) {//потрібний таб закритий
							
							tabCheckbox.checked = true;

						}
						
					}
					
				}
				
				var noValid = formO.getAttribute("data-no-valid");
				if (noValid && noValid == "scrollTo") {

					tools.scrollIt(tools.getOffsetRect(o)["top"], 200);
					

				}
			}
			
		}

		return formValidation;
		
	}

	setFormDynamicValid(data, o) {
		
		let dynamicValidAttr = o.getAttribute("data-dynamic-valid");

		if (dynamicValidAttr == undefined) {
			
			for (let name in data) {
				
				if (data[name]["valid"] != undefined) {
					
					data[name]["el"].addEventListener('input', function (event) {
						form.runDynamicValid(event["srcElement"]);
					});
				}

			}
			o.setAttribute("data-dynamic-valid", 1);
		}

	}
	
	runDynamicValid(el) {//динамічна валідація елемента форми
		
		valid.start(form.getDataInput(el));
		
	}
	
	setFormsReaction() {
		
		let forms = document.querySelectorAll("form");

		if (forms) {
			
			let i, inputs, data;
			
			for (i = 0; i < forms.length; i++) {
				
				form.setFormReaction(forms[i]);

			}
		}

	}
	
	setFormReaction(formCurrent) {
		

		let inputs = form.setInputs(formCurrent);/*отримали елементи форми з [name]*/
		if (inputs) {

			let data = form.getDataInputs(inputs);
			if (!data) {
				return;
			}
			
			let reaction;
			
			for (let name in data) {
				
				if (data[name]["reaction"] != undefined) {

					for (let i = 0; i < data[name]["reaction"].length; i++) {
						form.startReactionElement(data[name]["el"], data[name]["reaction"][i]);
					}
				}
			}

		}

	}
	
	startReactionElement(o, reaction) {

		// Видалення слухача (можливе, бо функція іменована)
		o.removeEventListener("input", form.handleReactionElement);
		//o.removeEventListener("focus", form.handleReactionElement);
		
		// Додавання слухача
		o.addEventListener("input", form.handleReactionElement);
		//o.addEventListener("focus", form.handleReactionElement);
		
	}
	
	handleReactionElement(event) {//іменована функція
		reaction.go(event["srcElement"]);
	}
	
}

class Valid {
	
	start(inputData) {

		var result = true;
		var r, tmp, p;

		for (let i = 0; i < inputData["valid"].length; i++) {
			
			p = {
				el		:	inputData["el"],
				type	:	inputData["valid"][i],
				value	:	inputData["value"]
			};
			
			tmp = inputData["valid"][i].split("|");//перевірка на додаткові параметри
			
			if (tmp[1] != undefined) {
				
				p["type"] = tmp[0];
				p["params"] = tmp[1];
				
			}
			
			if (typeof (this[p["type"]]) == "undefined") {
				/*console.log(this[p["type"]]);
				console.log(typeof (this[p["type"]]));
				console.log("Valid::" + p["type"] + " is undefined");*/
				result = false;
				
			} else {
				
				r = (this[p["type"]](p));
				
				if(!r){
					
					result = false;
				}
			}
		}
		
		this["markValided"](p["el"],result);
		return result;
	}
	
	markValided(el,action) {
		
		let groupEl = el.closest("div.block");

		if (action) {
			el.classList.remove("error");
			if (groupEl) {
				groupEl.classList.remove("error");
			}
		} else {
			el.classList.add("error");
			if (groupEl) {
				groupEl.classList.add("error");
			}
		}
	}
	
	/*valid function*/
	
	required(p) {

		return (p["value"] != "") ? true : false;
		
	}
	
	json(p) {

		try {
			JSON.parse(p["value"]);
		return true;
		} catch (e) {
			return false;
		}
		
	}
	
	minLength(p) {
		
		return (p["params"] != undefined && p["value"].length >= parseInt(p["params"])) ? true : false;
	}
	
	eMail(p) {
		
		let re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		return (re.test(p["value"])) ? true : false;
		
	}
	
	positiveInteger(p) {//.isInteger()
		
		var value = Number(p["value"]);
		if(p["params"] != undefined && p["params"] == "0"){
			return (!Number.isNaN(value) && Number.isInteger(value) && parseInt(p["value"]) >= 0) ? true : false;
		} else {
			return (!Number.isNaN(value) && Number.isInteger(value) && parseInt(p["value"]) > 0) ? true : false;
		}
	}
	
	positiveNumber(p) {
		
		var value = Number(p["value"]);
		if (p["params"] != undefined && p["params"] == "0") {
			return (!Number.isNaN(value) && parseFloat(p["value"]) >= 0) ? true : false;
		} else {
			return (!Number.isNaN(value) && parseFloat(p["value"]) > 0) ? true : false;
		}
	}
	
	positiveNumberOrEmpty(p) {
		
		if (p["value"] == "") {
			return true;
		}
		
		var value = Number(p["value"]);

		if (p["params"] != undefined && p["params"] == "0") {
			return (!Number.isNaN(value) && parseFloat(p["value"]) >= 0) ? true : false;
		} else {
			return (!Number.isNaN(value) && parseFloat(p["value"]) > 0) ? true : false;
		}
	}
	
	phone(p) {
		
		if (p["params"] != undefined) {
			var re;
			switch (p["params"]) {
				case "9":
					re = /^[0-9]{9}$/g;
				break;
				
				case "10":
					re = /^[0][0-9]{9}$/g;
				break;
				
				case "12":
					re = /^[0-9]{12}$/g;
				break;
				
				case "9-14":
					re = /^[0-9]{9,14}$/g;
				break;
				
				case "int":

					// Об'єкт із довжинами номерів для кодів країн (довжина цифр після коду країни)
					const countryCodeLengths = {
						'+1': 10,   // США, Канада
						'+380': 9,  // Україна
						'+44': 10,  // Великобританія
						'+81': 10,  // Японія
						'+91': 10,  // Індія
						'+86': 11,  // Китай
						'+33': 9,   // Франція
						'+49': 10   // Німеччина
						// Додайте інші коди країн за потреби
					};

					// Отримуємо значення поля вводу
					let value = p["value"];

					// Залишаємо лише цифри та знак "+" на початку
					let digits = value.replace(/[^0-9+]/g, '');
					if (!digits.startsWith('+')) {
						digits = '+' + digits.replace(/\+/g, '');
					}

					// Визначаємо код країни (1–3 цифри після "+")
					let countryCode = '';
					if (digits.match(/^\+\d{1,3}/)) {
						countryCode = digits.match(/^\+\d{1,3}/)[0];
					}

					// Отримуємо очікувану довжину номера для коду країни
					const expectedLength = countryCodeLengths[countryCode] || 9; // 9 — мінімальна довжина за замовчуванням
					const maxLength = Math.min(14, expectedLength); // Обмежуємо до 14 цифр (15 із "+")

					// Обрізаємо цифри до максимальної довжини (без урахування "+")
					let numberPart = digits.slice(countryCode.length);
					if (numberPart.length > maxLength) {
						numberPart = numberPart.substring(0, maxLength);
					}

					// Формуємо кінцевий номер
					p["value"] = countryCode + numberPart;

					// Валідація регулярним виразом
					re = /^\+[0-9]{9,14}$/;
					
					/*if (!re.test(o.value)) {
						o.setCustomValidity('Номер телефону має починатися з "+" і містити від 9 до 14 цифр');
					} else {
						// Додаткова перевірка довжини для коду країни
						const totalLength = o.value.length - countryCode.length; // Кількість цифр після коду
						if (countryCodeLengths[countryCode] && totalLength !== countryCodeLengths[countryCode]) {
							o.setCustomValidity(`Номер для коду ${countryCode} має містити ${countryCodeLengths[countryCode]} цифр`);
						} else {
							o.setCustomValidity('');
						}
					}*/
					
				break;
				
				case "internationalMask":/*https://github.com/liggth/inputmask-phones*/
					re = /^[+0-9 ]{17}$/g;
				break;
			}
			return (re.test(p["value"])) ? true : false;
		} else {
			return false;
		}
	}
	
	urlPath(p) {

		/*тільки цифри, латинські літери, дефіс, символ підкреслення, крапка*/
		var re = /^[a-zA-Z0-9._-]+$/;
		return (re.test(p["value"])) ? true : false;
		
	}

}

class Reaction {
	
	go(o) {

		let list = o.getAttribute("data-reaction").split(" ");

		if (list.length >0) {
			
			for (let i = 0; i < list.length; i++) {
				
				if (list[i] in reaction) {
					
					reaction[list[i]](o);
					
				} else {
					
					console.log("reaction."+list[i] + " not Created");
				}
			}
			/*o.removeAttribute("data-reaction");*/
		}

	}
	
	/*goAll() {
		
		let oS = document.querySelectorAll("[data-reaction]");
		
		let list, i, j;

		if (oS.length > 0) {
			
			for (i = 0; i < oS.length; i++) {
				
				list = oS[i].getAttribute("data-reaction").split(" ");
				
				for (j = 0; j < list.length; j++) {
					
					if (list[j] in reaction) {
						
						reaction[list[j]](oS[i]);
						
					} else {
						
						console.log("reaction."+list[j] + " not Created");
					}
				}
			}
		}
	}*/
	
	trimStart(o) {//на початку
		
		var selection = window.getSelection();
		var startPosition = null;
		var lenght = o.value.length;
		
		if (selection.anchorNode !== null) {
			var selectionNode = selection.anchorNode.childNodes[selection.anchorOffset];
			if (selectionNode) {
				
				startPosition = selectionNode.selectionStart;
			
			}
		}
		
		o.value = o.value.trimStart();
		
		if (o.value.length != lenght && startPosition) {//можна трохи краще )
			o.selectionStart = startPosition;
			o.selectionEnd = startPosition;
		}
		
	}
	
	trim(o) {
		o.value = o.value.trim();
	}
	
	lengthView(elem) {

		var spanInfo, place, html, maxlength;
		
		if (elem.parentElement.classList.contains("line") || elem.parentElement.classList.contains("block")) {
			
			place = elem.parentElement;//сюди вставимо span.info
			
			spanInfo = place.querySelector("span.info");
			
			if (!spanInfo) {//якщо нема — створюємо
				
				spanInfo = element.create("span", {"class" : "info"});
				place.append(spanInfo);
				
			}
			
			html = elem.value.length;
			maxlength = elem.getAttribute("maxlength");
			
			if (maxlength) {
				html += "-" + maxlength;
			}
			
			spanInfo.innerHTML = html;

		}

	}
	
	deleteComma (o) {
		
		o.value = o.value.replace(",", "");
		
	}
	
	commaToPoint (o) {
		o.value = o.value.replace(",", ".");
		
	}
	
	removeFirstZero (o) {

		if (o.value[0] == "0") {
			o.value = o.value.slice(1);
		}

	}
	
	leaveNumbersDott (o) {

		o.value = o.value.replace(/,/g, ".").replace(/[^\d.]/g, "");

	}
	
	formBlockAlertView (o) {

		console.log(o.closest("form .block").querySelector(".alert"));
		o.closest("form .block").querySelector(".alert").classList.remove("displayNone");
		//o.value = o.value.replace(/[^\d;]/g, ""); 

	}
	
	/*contactHandler (input) {
		
		var type= input.closest("[data-type='form']").querySelector("[data-name='type']");
		
		if (!type) {
			input.closest("form").querySelector("[name=type]");
		}

		var value = input.value;
		
		if (input && type) {

			switch (type.value) {
				
				case "1"://phone

					value = value.replace(/[^+\d]/g, "");
				break;
				
			}

		}

		input.value = value;
		
	}*/
	
	lengthWordView(o) {
		
		var elem = o.target;
		var spanInfo, place, html;
		
		if (elem.parentElement.classList.contains("line") || elem.parentElement.classList.contains("block")) {
			
			place = elem.parentElement;//сюди вставимо span.info
			
			spanInfo = place.querySelector("span.info");
			
			if (!spanInfo) {//якщо нема — створюємо
				
				spanInfo = element.create("span", {"class" : "info"});
				place.append(spanInfo);
				
			}
			
			html = "["+elem.value.split(" ").length+"]";
			spanInfo.innerHTML = html;

		}

	}
	
	setSpecInComma(o) {
		
		let spec = o.closest(".block").querySelector("select[data-spec]");
		let elemValue = o.value;
		
		if (
			spec 
			&&  !spec.querySelector("option[value='IN|']").selected
			&& (elemValue.includes(",") || elemValue.includes("б")) 
		) {

			spec.querySelector("option[value='IN|']").selected = true;		
		}
		
		if (elemValue.includes("б")) {//кирилична розкладка

			o.value = elemValue.replace("б", ",");
		}		
	}
	
	replaceNotNumbersComma(o) {
		//console.log(o.value);
		/*o.value = o.value.replace(/\D/g, ",");//Все, що не числа
		o.value = o.value.replace(/,+/g, ",");*/
		//console.log(o.value);
	}
	
	stripTags(o) {
		o.value = o.value.replace(/<\/?[^>]+(>|$)/g, "");
	}
	
	phoneInt(o) {
		// Отримуємо значення поля вводу
		let value = o.value;

		// Залишаємо лише цифри
		let digits = value.replace(/[^0-9]/g, '');

		// Обмежуємо довжину до 14 цифр (15-й символ буде "+")
		if (digits.length > 14) {
			digits = digits.substring(0, 14);
		}

		// Додаємо "+" на початок і оновлюємо значення поля
		o.value = '+' + digits;

	}

	leaveOnlyNumbers (o) {
		/*залишити тільки цифри*/
		o.value = o.value.replace(/[^\d]/g, ""); 

	}
	
	setFirstDigitZero(o) {
		/*встановити першим числом 0*/
		
		if (o.value.length > 0) {
			if (o.value[0] !== '0') {
				o.value = '0' + o.value.slice(1);
			}
		} else {
			o.value = '0';
		}
	}


}

Factory.register("Form", Form);form = Factory.create("Form");
Factory.register("Valid", Valid);valid = Factory.create("Valid");
Factory.register("Reaction", Reaction); reaction = Factory.create("Reaction");
/* !
* tingle.js
* @author  robin_parisi
* @version 0.15.2
* @url https://tingle.robinparisi.com/
*/

/* global define,module */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory)
  } else if (typeof exports === 'object') {
    module.exports = factory()
  } else {
    root.tingle = factory()
  }
}(this, function () {
  /* ----------------------------------------------------------- */
  /* == modal */
  /* ----------------------------------------------------------- */

  var isBusy = false

  function Modal (options) {
    var defaults = {
      onClose: null,
      onOpen: null,
      beforeOpen: null,
      beforeClose: null,
      stickyFooter: false,
      footer: false,
      cssClass: [],
      closeLabel: 'Close',
      closeMethods: ['overlay', 'button', 'escape']
    }

    // extends config
    this.opts = extend({}, defaults, options)

    // init modal
    this.init()
  }

  Modal.prototype.init = function () {
    if (this.modal) {
      return
    }

    _build.call(this)
    _bindEvents.call(this)

    // insert modal in dom
    document.body.appendChild(this.modal, document.body.firstChild)

    if (this.opts.footer) {
      this.addFooter()
    }

    return this
  }

  Modal.prototype._busy = function (state) {
    isBusy = state
  }

  Modal.prototype._isBusy = function () {
    return isBusy
  }

  Modal.prototype.destroy = function () {
    if (this.modal === null) {
      return
    }

    // restore scrolling
    if (this.isOpen()) {
      this.close(true)
    }

    // unbind all events
    _unbindEvents.call(this)

    // remove modal from dom
    this.modal.parentNode.removeChild(this.modal)

    this.modal = null
  }

  Modal.prototype.isOpen = function () {
    return !!this.modal.classList.contains('tingle-modal--visible')
  }

  Modal.prototype.open = function () {
    if (this._isBusy()) return
    this._busy(true)

    var self = this

    // before open callback
    if (typeof self.opts.beforeOpen === 'function') {
      self.opts.beforeOpen()
    }

    if (this.modal.style.removeProperty) {
      this.modal.style.removeProperty('display')
    } else {
      this.modal.style.removeAttribute('display')
    }

    // prevent double scroll
    this._scrollPosition = window.pageYOffset
    document.body.classList.add('tingle-enabled')
    //Yakubets document.body.style.top = -this._scrollPosition + 'px'

    // sticky footer
    this.setStickyFooter(this.opts.stickyFooter)

    // show modal
    this.modal.classList.add('tingle-modal--visible')

    // onOpen callback
    if (typeof self.opts.onOpen === 'function') {
      self.opts.onOpen.call(self)
    }

    self._busy(false)

    // check if modal is bigger than screen height
    this.checkOverflow()

    return this
  }

  Modal.prototype.close = function (force) {
    if (this._isBusy()) return
    this._busy(true)
    force = force || false

    //  before close
    if (typeof this.opts.beforeClose === 'function') {
      var close = this.opts.beforeClose.call(this)
      if (!close) {
        this._busy(false)
        return
      }
    }

    document.body.classList.remove('tingle-enabled')
    document.body.style.top = null
    window.scrollTo({
      top: this._scrollPosition,
      behavior: 'instant'
    })

    this.modal.classList.remove('tingle-modal--visible')

    // using similar setup as onOpen
    var self = this

    self.modal.style.display = 'none'

    // onClose callback
    if (typeof self.opts.onClose === 'function') {
      self.opts.onClose.call(this)
    }

    // release modal
    self._busy(false)
  }

  Modal.prototype.setContent = function (content) {
    // check type of content : String or Node
    if (typeof content === 'string') {
      this.modalBoxContent.innerHTML = content
    } else {
      this.modalBoxContent.innerHTML = ''
      this.modalBoxContent.appendChild(content)
    }

    if (this.isOpen()) {
      // check if modal is bigger than screen height
      this.checkOverflow()
    }

    return this
  }

  Modal.prototype.getContent = function () {
    return this.modalBoxContent
  }

  Modal.prototype.addFooter = function () {
    // add footer to modal
    _buildFooter.call(this)

    return this
  }

  Modal.prototype.setFooterContent = function (content) {
    // set footer content
    this.modalBoxFooter.innerHTML = content

    return this
  }

  Modal.prototype.getFooterContent = function () {
    return this.modalBoxFooter
  }

  Modal.prototype.setStickyFooter = function (isSticky) {
    // if the modal is smaller than the viewport height, we don't need sticky
    if (!this.isOverflow()) {
      isSticky = false
    }

    if (isSticky) {
      if (this.modalBox.contains(this.modalBoxFooter)) {
        this.modalBox.removeChild(this.modalBoxFooter)
        this.modal.appendChild(this.modalBoxFooter)
        this.modalBoxFooter.classList.add('tingle-modal-box__footer--sticky')
        _recalculateFooterPosition.call(this)
        this.modalBoxContent.style['padding-bottom'] = this.modalBoxFooter.clientHeight + 20 + 'px'
      }
    } else if (this.modalBoxFooter) {
      if (!this.modalBox.contains(this.modalBoxFooter)) {
        this.modal.removeChild(this.modalBoxFooter)
        this.modalBox.appendChild(this.modalBoxFooter)
        this.modalBoxFooter.style.width = 'auto'
        this.modalBoxFooter.style.left = ''
        this.modalBoxContent.style['padding-bottom'] = ''
        this.modalBoxFooter.classList.remove('tingle-modal-box__footer--sticky')
      }
    }

    return this
  }

  Modal.prototype.addFooterBtn = function (label, cssClass, callback) {
    var btn = document.createElement('button')

    // set label
    btn.innerHTML = label

    // bind callback
    btn.addEventListener('click', callback)

    if (typeof cssClass === 'string' && cssClass.length) {
      // add classes to btn
      cssClass.split(' ').forEach(function (item) {
        btn.classList.add(item)
      })
    }

    this.modalBoxFooter.appendChild(btn)

    return btn
  }

  Modal.prototype.resize = function () {
    // eslint-disable-next-line no-console
    console.warn('Resize is deprecated and will be removed in version 1.0')
  }

  Modal.prototype.isOverflow = function () {
    var viewportHeight = window.innerHeight
    var modalHeight = this.modalBox.clientHeight

    return modalHeight >= viewportHeight
  }

  Modal.prototype.checkOverflow = function () {
    // only if the modal is currently shown
    if (this.modal.classList.contains('tingle-modal--visible')) {
      if (this.isOverflow()) {
        this.modal.classList.add('tingle-modal--overflow')
      } else {
        this.modal.classList.remove('tingle-modal--overflow')
      }

      // tODO: remove offset
      // _offset.call(this);
      if (!this.isOverflow() && this.opts.stickyFooter) {
        this.setStickyFooter(false)
      } else if (this.isOverflow() && this.opts.stickyFooter) {
        _recalculateFooterPosition.call(this)
        this.setStickyFooter(true)
      }
    }
  }

  /* ----------------------------------------------------------- */
  /* == private methods */
  /* ----------------------------------------------------------- */

  function closeIcon () {
    return '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M.3 9.7c.2.2.4.3.7.3.3 0 .5-.1.7-.3L5 6.4l3.3 3.3c.2.2.5.3.7.3.2 0 .5-.1.7-.3.4-.4.4-1 0-1.4L6.4 5l3.3-3.3c.4-.4.4-1 0-1.4-.4-.4-1-.4-1.4 0L5 3.6 1.7.3C1.3-.1.7-.1.3.3c-.4.4-.4 1 0 1.4L3.6 5 .3 8.3c-.4.4-.4 1 0 1.4z" fill-rule="nonzero"/></svg>'
  }

  function _recalculateFooterPosition () {
    if (!this.modalBoxFooter) {
      return
    }
    this.modalBoxFooter.style.width = this.modalBox.clientWidth + 'px'
    this.modalBoxFooter.style.left = this.modalBox.offsetLeft + 'px'
  }

  function _build () {
    // wrapper
    this.modal = document.createElement('div')
    this.modal.classList.add('tingle-modal')

    // remove cusor if no overlay close method
    if (this.opts.closeMethods.length === 0 || this.opts.closeMethods.indexOf('overlay') === -1) {
      this.modal.classList.add('tingle-modal--noOverlayClose')
    }

    this.modal.style.display = 'none'

    // custom class
    this.opts.cssClass.forEach(function (item) {
      if (typeof item === 'string') {
        this.modal.classList.add(item)
      }
    }, this)

    // close btn
    if (this.opts.closeMethods.indexOf('button') !== -1) {
      this.modalCloseBtn = document.createElement('button')
      this.modalCloseBtn.type = 'button'
      this.modalCloseBtn.classList.add('tingle-modal__close')

      this.modalCloseBtnIcon = document.createElement('span')
      this.modalCloseBtnIcon.classList.add('tingle-modal__closeIcon')
      this.modalCloseBtnIcon.innerHTML = closeIcon()

      this.modalCloseBtnLabel = document.createElement('span')
      this.modalCloseBtnLabel.classList.add('tingle-modal__closeLabel')
      this.modalCloseBtnLabel.innerHTML = this.opts.closeLabel

      this.modalCloseBtn.appendChild(this.modalCloseBtnIcon)
      this.modalCloseBtn.appendChild(this.modalCloseBtnLabel)
    }

    // modal
    this.modalBox = document.createElement('div')
    this.modalBox.classList.add('tingle-modal-box')

    // modal box content
    this.modalBoxContent = document.createElement('div')
    this.modalBoxContent.classList.add('tingle-modal-box__content')

    this.modalBox.appendChild(this.modalBoxContent)

    if (this.opts.closeMethods.indexOf('button') !== -1) {
      this.modal.appendChild(this.modalCloseBtn)
    }

    this.modal.appendChild(this.modalBox)
  }

  function _buildFooter () {
    this.modalBoxFooter = document.createElement('div')
    this.modalBoxFooter.classList.add('tingle-modal-box__footer')
    this.modalBox.appendChild(this.modalBoxFooter)
  }

  function _bindEvents () {
    this._events = {
      clickCloseBtn: this.close.bind(this),
      clickOverlay: _handleClickOutside.bind(this),
      resize: this.checkOverflow.bind(this),
      keyboardNav: _handleKeyboardNav.bind(this)
    }

    if (this.opts.closeMethods.indexOf('button') !== -1) {
      this.modalCloseBtn.addEventListener('click', this._events.clickCloseBtn)
    }

    this.modal.addEventListener('mousedown', this._events.clickOverlay)
    window.addEventListener('resize', this._events.resize)
    document.addEventListener('keydown', this._events.keyboardNav)
  }

  function _handleKeyboardNav (event) {
    // escape key
    if (this.opts.closeMethods.indexOf('escape') !== -1 && event.which === 27 && this.isOpen()) {
      this.close()
    }
  }

  function _handleClickOutside (event) {
    // on macOS, click on scrollbar (hidden mode) will trigger close event so we need to bypass this behavior by detecting scrollbar mode
    var scrollbarWidth = this.modal.offsetWidth - this.modal.clientWidth
    var clickedOnScrollbar = event.clientX >= this.modal.offsetWidth - 15 // 15px is macOS scrollbar default width
    var isScrollable = this.modal.scrollHeight !== this.modal.offsetHeight
    if (navigator.platform === 'MacIntel' && scrollbarWidth === 0 && clickedOnScrollbar && isScrollable) {
      return
    }

    // if click is outside the modal
    if (this.opts.closeMethods.indexOf('overlay') !== -1 && !_findAncestor(event.target, 'tingle-modal') &&
        event.clientX < this.modal.clientWidth) {
      this.close()
    }
  }

  function _findAncestor (el, cls) {
    while ((el = el.parentElement) && !el.classList.contains(cls));
    return el
  }

  function _unbindEvents () {
    if (this.opts.closeMethods.indexOf('button') !== -1) {
      this.modalCloseBtn.removeEventListener('click', this._events.clickCloseBtn)
    }
    this.modal.removeEventListener('mousedown', this._events.clickOverlay)
    window.removeEventListener('resize', this._events.resize)
    document.removeEventListener('keydown', this._events.keyboardNav)
  }

  /* ----------------------------------------------------------- */
  /* == helpers */
  /* ----------------------------------------------------------- */

  function extend () {
    for (var i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
        if (arguments[i].hasOwnProperty(key)) {
          arguments[0][key] = arguments[i][key]
        }
      }
    }
    return arguments[0]
  }

  /* ----------------------------------------------------------- */
  /* == return */
  /* ----------------------------------------------------------- */

  return {
    modal: Modal
  }
}))
class Run {
	
	init(addInitParams) {
		
		library.setLanguage(addInitParams["language"]);
		
		window.addEventListener ("popstate", function () {
			run.go();
		});
		tools.toTopInit(document.getElementById("to-top"));
		tools.accordionInit();
		tools.navMenuInit(true, ["tm-0", "filter-panel"]);
		run.shortcutInit();
		run.go();
		
	}
	
	go(o, action) {

		var params = run.defParams(o);

		if (params) {

			if (
				params["h"] != undefined
				&& params["a"] != undefined
			) {

				var classReady = Factory.create(tools.capitalize(params["h"]));
				
				if (
					classReady
					&& classReady.go != undefined
				) {
					
					classReady.go(params, o, action);
					
				} else {
					
					vNotify.error({text: "JS class "+tools.capitalize(params["h"])+" or method " + params["h"] + ".go() " + library.get("Not Found"),visibleDuration:10000});
				}
				
			}
			run.hidePanelTMenu();

		}
	}

	pushHistoryState(strParams) {
		
		var prevStrParams = null;
		
		if (history.state) {
			
			prevStrParams = history.state["strParams"];
			
		}
		
		if (strParams != prevStrParams) {
			
			history.pushState({strParams:strParams}, null, strParams);
		}
		
	}
	
	defParams(o) {

		var strParams = null;
		
		if (o !== undefined) {//запуск по команді

			if (o.tagName != undefined) {

				switch (o.tagName) {
					
					case "A"://href для посилання
						strParams = o.href.replace(document.location.protocol+"//"+document.location.hostname,"");
						var strParamsWork = strParams.split("/")[3];
						
						var params = tools.transformStrToObj(strParamsWork);
						if (params["a"]["section"] == undefined) {//вписуємо в історію
							
							run.pushHistoryState(strParams);
							
						} else {//вписуємо в поле, що імітує Url
							
							if (params?.["a"]?.["elementID"]) {
								
								var elemForDataUrl = document.getElementById("e"+params["a"]["mode"]+"ArticleBefore" + params["a"]["elementID"]);
								if (elemForDataUrl) {
									
									var input = elemForDataUrl.closest("section").querySelector("[data-url]");
									
									if (input) {
										
										input.value = strParams;
										
									}

								}

							}
							
						}
						return params;

					break;
					
					default://в інших випадках атрибут data-href
						strParams = o.getAttribute("data-href");
				}
				
			} else {//немає tagName
				
				if (typeof o == "string") {
					
					var p = tools.transformStrToObj(o);
					
					if (p["a"]?.["mode"] && p?.["a"]?.["elementID"]) {
						
						var elemForDataUrl = document.getElementById("e"+p["a"]["mode"]+"ArticleBefore" + p["a"]["elementID"]);
						
						if (elemForDataUrl) {
							
							var input = elemForDataUrl.closest("section").querySelector("[data-url]");
							
							if (input) {
								
								input.value = "/p/run/"+o;
								
							}

						}

					} else {
						run.pushHistoryState(o);
					}
					return p;
					
				}
			}

		} else {//аналізуємо Url
			
			strParams = document.location.pathname;
			
		}
		
		if (strParams) {
			strParams = strParams.split("/")[3];
		}

		if (strParams == undefined || strParams == "") {//головна адмінки

			runTools.runDashBoard();
			
		}
		
		return tools.transformStrToObj(strParams);
	}
	
	shortcutInit() {
		
		/*shortcut.add("Ctrl+Left", function(){history.go(-1)});
		shortcut.add("Ctrl+Right", function(){history.go(1)});*/
		
		shortcut.add("Alt+F", function(){runTools.filterToggle()});
		shortcut.add("Alt+Left", function(){run.setHref("prev");});
		shortcut.add("Alt+Right", function(){run.setHref("next");});
		shortcut.add("Alt+Up", function(){run.setHref("start");});
		shortcut.add("Alt+Down", function(){run.setHref("end");});
		shortcut.add("Alt+R", function(){run.go();});
		
		shortcut.add("Alt+U", function() {editor.go(["<ul>", "</ul>"]);});
		shortcut.add("Alt+O", function() {editor.go(["<ol>", "</ol>"]);});
		shortcut.add("Alt+P", function() {editor.go(["<p>", "</p>"]);});
		shortcut.add("Alt+B", function() {editor.go(["<strong>", "</strong>"]);});
		shortcut.add("Alt+I", function() {editor.go(["<em>", "</em>"]);});
		shortcut.add("Alt+Enter", function() {editor.go(["<br>", ""]);});
		shortcut.add("Alt+2", function() {editor.go(["<h2>", "</h2>"]);});
		shortcut.add("Alt+3", function() {editor.go(["<h3>", "</h3>"]);});
		shortcut.add("Alt+C", function() {editor.clone();});
		
		shortcut.add("Alt+G", function() {
			
			var btn = document.querySelector("header [data-mode=asset-set-run]");
			
			if (btn) {
				
				btn.click();
			
			}
		});
		
		shortcut.add("Ctrl+G", function() {
			
			var btn = document.querySelector("header [data-mode=asset-set-article]");
			
			if (btn) {
				
				btn.click();
			
			}
		});
		
		shortcut.add("Insert", function() {
			
			var insert = document.querySelector("[data-id=eHeaderAfter] [data-action=row-add],[data-id=eArticle] table[data-name] thead [data-action=row-add]");
			if (insert) {
				insert.click();
			}
		});
		
		shortcut.add("Alt+S", function() {
			
			var r = null;
			var selection = document.activeElement;

			if (selection.closest("[data-type='form']") !== null) {

				r = selection.closest("[data-type='form']").querySelector("[data-action='row-save']");

			} else {
				
				if (selection.closest("form") !== null) {
					r = selection.closest("form").querySelector("[data-action='row-save']");
				}
			
			}
			
			if (r !== null) {
				r.click();
			}

		});
		
		shortcut.add("Ctrl+S", function() {
			
			var r = null;
			var selection = document.activeElement;

			if (selection.closest("[data-type='form']") !== null) {

				r = selection.closest("[data-type='form']").querySelector("[data-action='row-save']");

			} else {
				
				if (selection.closest("form") !== null) {
					r = selection.closest("form").querySelector("[data-action='row-save']");
				}
			
			}
			
			if (r !== null) {
				r.click();
			}

		});
		
		shortcut.add("Esc", function() {
			var rowCloses = document.getElementById("content").querySelectorAll("[data-id=eArticle] table[data-name] [data-action=row-close]");
			if (rowCloses) {
				for (var i in rowCloses) {
					if (!isNaN (i)) {
						rowCloses[i].click();
					}
				}
			}
		});
		
		shortcut.add("Alt+H", function() {
			var btnHelp = document.querySelector("[data-action=table-help]");
			if (btnHelp != undefined){
				btnHelp.click();
			}
		});
		
		shortcut.add("Alt+Q", function() {
			tools.work(0);
		});
		
		shortcut.add("Alt+Esc", function() {
			tools.work(0);
		});
	}

	setHref (type) {
		//var a = document.querySelector("#eArticleAfter ul.pagination li."+type+" a");
		var a = document.getElementById("content").querySelector("[data-id=eArticleAfter] ul.pagination li."+type+" a");
		if (a && a.getAttribute("href")) {
			run.go(a);return false;
		}
	}
	
	hidePanelTMenu () {
		let chs = document.querySelectorAll("nav.tm input[type=checkbox]");
		if (chs) {
			for (var i in chs) {
				if (!isNaN(i)) {
					chs[i].checked = false;
				}
			}
		}
	}
	
}

class Table {
	
	go(args, o, action) {

		if (args["a"]["action"] == undefined) {//замовчування
			
			args["a"]["action"] = "view";

		}
		
		if (args["a"]["action"] in table) {
			
			return table[args["a"]["action"]](args, o, action);
			
		} else {
			
			vNotify.error({text: "table::"+args["a"]["action"]+" "+library.get("Not Found"),visibleDuration: 10000, position: center});
			
		}
		
	}

	view(args, o, action) {

		var argsAjax = {
			h	:	args["h"],
			a	:	args["a"],
		};
		
		tools.work(1);
		ajax.start(argsAjax).then(
		
			function(d) {
				
				d = ajax.end(d); tools.work(0);
				
				construction["lineMan"](d, o, args);

				if (args["a"]["section"] == undefined && args["a"]["ID"] == undefined) {
					
					//основна таблиця
					var header = args["a"]["name"] + ", " + library.get("Table");
					var title = document.querySelector("title").getAttribute("data-text");
					
					if (d?.config?.["header"]) {
						header = d.config["header"].replace(/(<([^>]+)>)/gi, "");
					}
					
					document.title = header + " | " + title;

				}
				
				if (action?.["after"]) {
					
					//Factory.create(action["class"])[action["method"]](action["args"]);
					var classReady = Factory.create(action["after"]["class"]);
					
					if (classReady) {

						if (action["after"]["method"] in classReady) {
							
							classReady[action["after"]["method"]](action["after"]["args"]);
							
						} else {
							
							vNotify.error({text: "JS:" + action["after"]["class"] + "::"+action["after"]["method"]+" "+library.get("Not Found"),visibleDuration:10000});
							
						}
						
					} else {
						
						vNotify.error({text: "JS: class "+action["class"]+" "+library.get("Not Found"),visibleDuration:10000});
						
					}
				}
			}
		);
	}
	
	reload(args, o) {//перечитати рядок

		args["a"]["work"] = 1;
		ajax.start(args, o).then(
		
			function(d) {

				construction["lineMan"](ajax.end(d, o), o);
				
			}
			
		);
		
	}	

	trReload(data, args, config, addData, tr) {

		table.tableRow (tr, data, args, config, args["a"]["ID"], 0, addData);

	}
		
	edit(args, o, action) {
		
		args["a"]["work"] = 1;
		
		ajax.start(args).then(
		
			function(d) {
				d = ajax.end(d);
				construction["lineMan"](d, o, args);
			}
			
		);
		
	}
	
	tableFormation(data, args, config, addData){

		/* компонуємо таблицю*/
		if(config == undefined){
			
			config = {};
			
		}
		var tableObj = element.create("table");
		
		if (config?.["table"]?.["attr"]) {
			
			element.attrAdd(tableObj,config["table"]["attr"]);
			
		}
		if (args["a"]?.["name"]) {
			
			tableObj.setAttribute("data-name", args["a"]["name"]);
			
		}
		var thead = element.create("thead");
		thead = table.tableHead(thead, data, args, config, addData); 
		tableObj.append(thead);
		
		var tbody = element.create("tbody");
		tbody = table.tableBody(tbody, data, args, config, addData);
		tableObj.append(tbody);

		var tfoot = element.create("tfoot");
		tfoot = table.tableFoot(tfoot, data, args, config, addData);
		tableObj.append(tfoot);
		
		if (args["a"]["action"] == "edit") {
			
			var formAction = {
				h	:	"exec",
				a:{
					"name"		:	"tableEditSave",
					"table"		:	args["a"]["name"],
				}
			};
			var div = element.create("form", {
				"class"	:	"groups",
				"attr"	:	{
					"method"			:	"post",
					"onsubmit"			:	"form.go(this);return false",
					"data-first-run"	:	"setFormDynamicValid",
					"action"			:	tools.transformObjToStr(formAction),
				}
			});

		} else {
			var div = element.create("div");//обгортка над таблицею, до якої можна використати padding
		}
		
		div.append(tableObj);
		return div;
	}

	tableHead(thead, data, args, config, addData) {
		
		if (data["headers"] != undefined) {
			
			let colsCSS = null;
			
			if (config["colsCSS"] != undefined) {
				colsCSS = [];
				colsCSS[0] = Object.keys(config["colsCSS"]);
				colsCSS[1] = Object.values(config["colsCSS"]);
			}
			
			var tr = element.create("tr");
			
			var startTd = table.tableHeaderStartTd (data, args, colsCSS);
			
			if (startTd) {

				tr.append(startTd);
			}
			
			var keys = Object.keys(data["headers"]);
			var values = Object.values(data["headers"]);
			
			if (args["h"] == "table") {
				
				var hrefStart = "/p/run/";
				var actionStart = {
					h: "table",
					a:{
						"name"		:	args["a"]["name"],
						"action"	:	args["a"]["action"],
					}
				};

				if (args["a"]?.["filter"]) {
					actionStart["a"]["filter"] = args["a"]["filter"];
				}
				if (args["a"]?.["config"]) {
					actionStart["a"]["config"] = args["a"]["config"];
				}
				if (args["a"]?.["section"]) {
					actionStart["a"]["section"] = args["a"]["section"];
				}
				if (args["a"]?.["pageSize"]) {
					actionStart["a"]["pageSize"] = args["a"]["pageSize"];
				}
				
				var action;
				var sorted = config["sortOrder"];//є завжди
				
				if (args["a"]?.["sort"]) {
					sorted = args["a"]["sort"];
				}
			}
			
			var sort;
			var tdClass;
			var divWr;

			for (var i = 0; i < keys.length; i++) {
				
				sort = "";
				tdClass = "";
				divWr = ["",""];

				if (
					keys[i].indexOf("fakeField") !== 0 
					|| (config?.["sortedFakeCols"] && config?.["sortedFakeCols"]?.[keys[i]])
				) {//це не фейкове поле, бо не починається з fakeField, по ньому можна сортувати, або сортування зконфігуровано в налаштуваннях таблиці
					
					divWr = ["<div>","</div>"];
					
					if (sorted != undefined) {
						
						var needASC = true;
						var needDESC = true;
						
						if (keys[i] == Object.keys(sorted)[0]) {//проходимо по цьому полю
							
							if (Object.values(sorted)[0] == "DESC") {
								
								tdClass = "sorted-desc";
								needDESC = false; 
								
							} else {
								
								tdClass = "sorted-asc";
								needASC = false;
								
							}
							
						}

						sort = "<div class='sort'>";

							if (needASC) {
								action = actionStart;
								
								action["a"]["sort"] = {};
								action["a"]["sort"][keys[i]] = "ASC";
								sort += "<a href='"+hrefStart+tools.transformObjToStr(action)+"' class='btn la la-12 la-sort-up h-20 btn-white' data-action='table-sort-asc' onclick='run.go(this);return false' title='"+library.get("Sort ASC")+"'></a>";

							}
							
							if (needDESC) {
								
								action = actionStart;
								
								action["a"]["sort"] = {};
								action["a"]["sort"][keys[i]] = "DESC";
								sort += "<a href='"+hrefStart+tools.transformObjToStr(action)+"' class='btn la la-12 la-sort-down h-20 btn-white' data-action='table-sort-desc' onclick='run.go(this);return false' title='"+library.get("Sort DESC")+"'></a>";
							}

						sort += "</div>";//.sort
					}
				}
				var td = element.create("th");
				
				if (tdClass) {
					
					td.classList.add(tdClass);
					
				}

				if (config?.["colsHidden"] && config["colsHidden"].includes(keys[i])) {
					
					td.classList.add("displayNone");
					
				}
				

				if (colsCSS !== null && colsCSS[0].includes(keys[i])) {//стилі до th
					
					td.setAttribute("style", colsCSS[1][colsCSS[0].indexOf(keys[i])]);
					
				}
				
				td.innerHTML = divWr[0] + values[i] + sort + divWr[1];
				tr.append(td);
				
			}
			
			thead.append(tr);
		}
		return thead;
	}
	
	tableBody (tbody, data, args, config, addData) {
		
		if (data["data"]) {
			for (var i = 0; i < data["data"].length; i++) {
				var tr = element.create("tr");
				
				var ID = null;
				if (args["h"] == "table" && args["a"]["name"] != undefined) {

					if (data["data"][i][0] != undefined) {
						ID = data["data"][i][0];
					} else {
						if(data["data"][i]["ID"] != undefined){
							ID = data["data"][i]["ID"];
						}
					}
					tr.setAttribute("data-id", ID);
				}
				
				table.tableRow(tr, data, args, config, ID, i, addData);
				tbody.append(tr);
			}
		}
		return tbody;
	}
	
	tableFoot (tfoot, data, args, config, addData) {
		
		if (data["footers"] != undefined){
			var tr = element.create("tr");
			var startTd = table.tableFooterStartTd(data, args);
			if(startTd){
				tr.append(startTd);
			}

			for (var i = 0; i < data["footers"].length; i++) {
				var td = element.create("th");
				td.innerHTML = data["footers"][i];
				tr.append(td);
			}
			tfoot.append(tr);

		}
		return tfoot;
		
	}
	
	tableRow (tr, data, args, config, ID, i, addData) {

		if (args["a"]["action"] == "edit") {
			
			table.tableRowEdit (tr, data, args, config, ID, i, addData);
			return false;
			
		}

		/*інакше далі оновлюємо рядок таблиці*/
		
		var column = 0;
		var text;
		var field;
		var td;
		
		var startTd = table.tableBodyStartTd(data, args, config, ID);

		if (startTd) {

			tr.append(startTd);

		}

		for (var field in data["data"][i]) {
			
			text = data["data"][i][field];

			if (config?.["modify"]) {

				field = Object.keys(data["headers"])[column];

				if (Object.keys(config["modify"]).includes(field)) {
					
					if (tableModify[Object.keys(config["modify"][field])[0]] != undefined) {
						text = tableModify[Object.keys(config["modify"][field])[0]](text, field, data["data"][i],config["modify"][field], addData);

					} else {
						vNotify.error({text: "JS: tableModify::"+Object.keys(config["modify"][field])[0]+" "+library.get("Not Found"),visibleDuration:10000});
					}
					
				}
			}
			
			td = element.create("td");
			td.innerHTML = text;

			if (config?.["colsHidden"] && config["colsHidden"].includes(field)) {
				
				td.classList.add("displayNone");
				
			}
			
			if (config?.["colsEdited"] && config["colsEdited"].includes(field)) {
				
				td.classList.add("edited");
				td.setAttribute("title", library.get("Double Click") + " " + library.get("Edit"));
				td.setAttribute("ondblclick", "cell.edit(this)");
				td.setAttribute("data-field", field);
				
				//td.addEventListener("click", table.callbackColsEdited(field));
				
			}

			tr.append(td);
			
			column = column +1;
		}
		
		return tr;
	}

	tableBodyStartTd (data, args, config, ID){
		
		var td = null;

		if (args["h"] == "table" && args["a"]["name"] != undefined) {
			td = element.create("td");
			var toolbar = element.create("div",{
				class	:	"toolbar",
			});
			var checkbox = element.create("input",{
				attr	:	{
					type	:	"checkbox",
					onclick	:	"runTools.checkedTableRow(this)",
				},
				class:	"h-20"
			});
			
			var line = element.create("div", {class:"line"});
			line.append(checkbox);
			
			if(data?.["toolbarKit"]?.["tr"]){
				for(var i = 0; i < data["toolbarKit"]["tr"].length; i++) {
					toolbar.innerHTML += data["toolbarKit"]["tr"][i].replace("%7BID%7D", ID);
				}
			}
			line.append(toolbar);
			
			td.append(line);
		}
		
		return td;
	}
	
	tableHeaderStartTd (data, args, colsCSS) {
		
		var td = null;
		
		if (
			args["h"] == "table"
			&& args["a"]["name"] != undefined
		) {
			
			td = element.create("th");
			
			if (colsCSS !== null && colsCSS[0].includes("start-TD")) {//стилі до th
				
				td.setAttribute("style", colsCSS[1][colsCSS[0].indexOf("start-TD")]);
				
			}

			var toolbar = element.create("div",{
				class	:	["toolbar"],
			});
			var checkbox = element.create("input",{
				attr	:	{
					type	:	"checkbox",
					onclick	:	"runTools.checkedTable(this)",
				},
				class	:	"h-30"
			});
			var line = element.create("div", {class:"line"});
			line.append(checkbox);
			
			if(data?.["toolbarKit"]?.["table"]){
				for(var i = 0; i < data["toolbarKit"]["table"].length; i++) {
					toolbar.innerHTML += data["toolbarKit"]["table"][i];
				}
			}
			
			line.append(toolbar);
			td.append(line);
			
		}
		return td;
	}
	
	tableFooterStartTd (data, a){
		var h = "";
		if(a != undefined && a["name"] != undefined){
			h = "<td>-1</td>";
		}
		return h;
	}
	
	tableBefore(data, args, config) {
		
		var line = element.create("div", {class:"line"});
		var list = [
			0, 1, 2, 3, 4
		];
		var toolbar;
		
		for (var j = 0; j < list.length; j++) {
			
			if(data?.["toolbarKit"]?.["tableBefore" + j]){
				toolbar = element.create("div",{
					"class"	:	"toolbar",
					"attr"	:	{
						"data-list"	: j
					}
				});
				
				for(var i = 0; i < data["toolbarKit"]["tableBefore" + j].length; i++) {
					toolbar.innerHTML += data["toolbarKit"]["tableBefore" + j][i];
				}
				
				line.append(toolbar);
			}
			
		}

		return line;
	}

	pagination (data, args, config) {
		
		if (data === null) {
			return "";
		}
		var ul = null, li, tag, text, hrefParams, startHref = "/p/run/", select, option;

		ul = element.create("ul", {"class":"pagination"});
		
		if (data["list"] !== null) {
			
			for (var i = 0; i < data["list"].length; i++) {
				li = element.create("li");
				if (data["list"][i]["page"]){
					li.classList.add(data["list"][i]["page"]);
				}
				
				tag =  element.create(data["list"][i]["tag"]);
				
				switch (data["list"][i]["page"]) {
					
					case 'start':
						text = "<i class='las la-angle-double-left'></i>";
					break;
					case 'prev':
						text = "<i class='las la-angle-left'></i>";
					break;
					case 'next':
						text = "<i class='las la-angle-right'></i>";
					break;
					case 'end':
						text = "<i class='las la-angle-double-right'></i>";
					break;
					default:
						text = data["list"][i]["number"];
				}
				
				tag.innerHTML = text;

				if (data["list"][i]["tag"] == "a") {
					
					hrefParams = data["params"];
					
					if (data["list"][i]["number"]) {
						hrefParams["a"]["p"] = data["list"][i]["number"];
					}
					
					if (args["a"]?.["pageSize"]) {
						hrefParams["a"]["pageSize"] = args["a"]["pageSize"];
					}
					
					if (args["a"]?.["section"]) {
						hrefParams["a"]["section"] = args["a"]["section"];
					}
					
					if (args["a"]?.["action"]) {
						hrefParams["a"]["action"] = args["a"]["action"];
					}
					
					if (args["a"]?.["config"]) {
						hrefParams["a"]["config"] = args["a"]["config"];
					}

					tag = element.attrAdd(tag,{
						attr	:	{
							href	:	startHref + tools.transformObjToStr(hrefParams),
							onclick	:	"run.go(this);return false",
						}
					});
				}
				
				li.append(tag);
				ul.append(li);
				
			}
		}
	
		if (config["pageSize"] != undefined) {

			li = element.create("li", {class:["line", "nowrap"]});
			
			if(config["pageSize"].length == 1) {
				
				if (data["list"] !== null) {
					li = element.attrAdd(li, {"html" : "<span>"+library.get("On Page") + " </span>" + config["pageSize"][0]});
				}

				
			} else {
				
				li = element.attrAdd(li, {"html" : "<span>"+library.get("On Page") + " </span>"});
			
				for (var i = 0; i < config["pageSize"].length; i++) {
					
					hrefParams = data["params"];
					hrefParams["a"]["pageSize"] = config["pageSize"][i];
					
					if(hrefParams["a"]["p"] != undefined){
						delete hrefParams["a"]["p"];
					}
					
					if (args["a"]?.["mode"]) {
						hrefParams["a"]["mode"] = args["a"]["mode"];
					}
					
					if (args["a"]?.["action"]) {
						hrefParams["a"]["action"] = args["a"]["action"];
					}
					
					if (args["a"]?.["config"]) {
						hrefParams["a"]["config"] = args["a"]["config"];
					}
					
					option = element.create("a", {
						"html" : config["pageSize"][i],
						"class" : "btn",
						"attr":{
							href	:	startHref + tools.transformObjToStr(hrefParams),
							onclick	:	"run.go(this);return false",
					}});

					if(args["a"]["pageSize"] != undefined && args["a"]["pageSize"] == config["pageSize"][i]){
						option = element.attrAdd(option, {class:"secondary"});
					}

					if(args["a"]["pageSize"] == undefined && i == 0){
						option = element.attrAdd(option, {class:"secondary"});
					}
					li.append(option);
				}
			}
			
			ul.append(li);
		}
			
		return ul;
	}
	
	delete(args, o) {

		args["a"]["work"] = 1;
		
		if (args["a"]["ID"] != undefined) {
			
			args["IDs"] = [parseInt(args["a"]["ID"])];//по наявності розуміємо, що це рядок
			
		} else {

			var tableName = o.closest("table").getAttribute("data-name");
			var listIDBlock = document.querySelector("[data-id='eListID'][data-table='" + tableName + "']");

			if (listIDBlock) {
				
				args["IDs"] = listIDBlock.querySelector("input").value.split(",");
				
			}
		}

		if (args["IDs"] != undefined) {//видалення одного рядку або набору рядків 
			
			var deletedConfirm = confirm(library.get("You Want to Delete")+" "+args["IDs"].length+" "+library.get("Row")+" «"+args["a"]["name"]+"»: ["+args["IDs"].join(", ")+"]. "+library.get("Are you sure?"));
			
			if (deletedConfirm) {

				tools.work(1);
				ajax.start(args, o).then(
				
					function(d) {
						
						d = ajax.end(d, o); tools.work(0);
						
						if (d["info"]["success"]) {
							if(d["info"]["text"] != undefined){
								vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
							}
						} else {
							vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						}
						
						if (args["a"]["ID"] != undefined) {//видалення одного рядка по кнопці в цьому рядку
							if (o != undefined) {//якщо по кнопці
								o.closest("tr").remove();
							}
						} else {
							
							if (d["postAction"] != undefined) {
								
								Factory.create(d["postAction"]["class"])[d["postAction"]["method"]](d["postAction"]["args"], o);
								
							}
						}
						
					}
					
				);
				
			}
		}
	}
	
	clickButtonTableReload(args, o) {
		

		var inSection = o.closest("section");

		if (inSection) {//in section

			var reloadBtn = o.closest("section").querySelector("button[data-action='table-reload']");
			
		} else {//is mainTable
			
			var reloadBtn = document.querySelector("[data-id=eHeaderAfter] button[data-action='table-reload']");

		}
		
		if (reloadBtn) {
			
			reloadBtn.click();
			
		}
	
	}

	setValueFieldMultiple(o) {
		
		let table = o.closest(".line").querySelector("[data-id='eListID']").getAttribute("data-table");
		let field = o.getAttribute("data-field");
		
		let select = o.closest("div").querySelector("select, input");
		let value = select.value;

		let IDs = o.closest(".line").querySelector("[data-id='eListID'] input").value;
		let reloadButton = o.closest(".line").querySelector("[data-action='table-reload']");
		
		if (table && field && value && IDs && reloadButton) {

			let confirmed = confirm(library.get("Are you sure?"));

			if (confirmed) {
				
				var args = {
					h	:	"exec",
					a	:	{
						work	:	1,
						name	:	"tableSetValueFieldMultiple",
					},
					p	:	{
						table	:	table,
						field	:	field,
						value	:	value,
						IDs		:	IDs,
					}
					

				};
				
				ajax.start(args).then(
				
					function(d) {
						
						d = ajax.end(d);
						
						if (d["info"]["success"]) {//успішно

							vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
							select.value = "";//скинули значення селекта
							reloadButton.click();//оновили список
							
						} else {
							vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						}
					}
					
				);
				
			}

		}
		
	}
	
	freezeHead() {
		return;
		const container = document.querySelector("article > [data-id='eArticle'] > div");
		const thead = document.querySelector("article > [data-id='eArticle'] > div > table > thed");
		
		if (container  && thead) {
			alert(12);
			container.addEventListener('scroll', function() {
				
				const scrollPosition = container.scrollTop;
				const scrollHeight = container.scrollHeight;
				const clientHeight = container.clientHeight;

				// Визначаємо, коли ми досягли кінця таблиці (з невеликим запасом)
				const isAtBottom = scrollPosition + clientHeight >= scrollHeight - 1;

				if (isAtBottom) {
					thead.classList.remove('sticky');
				} else {
					thead.classList.add('sticky');
				}
			});
		
		}
	}

}

class Row {
	
	go(args, o) {
		if (args["a"]["action"] in row) {
			
			return row[args["a"]["action"]](args, o);
			
		} else {
			
			vNotify.error({
				text: "row::"+args["a"]["action"]+" "+library.get("Not Found"),
				visibleDuration:10000,
				position:center
			});
			
		}
	}
	
	copy(args, o) {
		args["a"]["work"] = 1;
		ajax.start(args, o).then(
			function(d){
				//console.log(ajax.end(d, o));return false;
				construction["lineMan"](ajax.end(d, o), o);
				if(d.action != undefined){
					console.log(d.action);return false;
					//Factory.create(action["class"])[action["method"]](action["args"]);
				}
			}
		);
	}
	
	reload(args, o) {
		
		args["a"]["work"] = 1;
		ajax.start(args, o).then(
			function(d){
				//console.log(ajax.end(d, o));return false;
				construction["lineMan"](ajax.end(d, o), o);
				if(d.action != undefined){
					console.log(d.action);return false;
					//Factory.create(action["class"])[action["method"]](action["args"]);
				}
			}
		);
	}
	
	edit(args, o, action) {

		var argsAjax = {
			h	:	args["h"],
			a	:	args["a"],
		};

		tools.work(1);
		ajax.start(argsAjax, o).then(
		
			function(d) {
				
				d = ajax.end(d, o); tools.work(0);
				
				construction["lineMan"](d, o, args);
				
				if (action?.["after"]) {
					
					console.log(action["after"]);
					//Factory.create(action["class"])[action["method"]](action["args"]);
					var classReady = Factory.create(action["after"]["class"]);
					
					if (classReady) {
						
						if (action["after"]["method"] in classReady) {
							
							classReady[action["after"]["method"]](action["after"]["args"]);
							
						} else {
							
							vNotify.error({text: "JS:" + action["class"] + "::"+action["method"]+" "+library.get("Not Found"),visibleDuration:10000});
							
						}
						
					} else {
						
						vNotify.error({text: "JS: class "+action["class"]+" "+library.get("Not Found"),visibleDuration:10000});
						
					}
				}
				
				if (d.action != undefined) {//дія з серверу
					
					console.log(d.action);return false;
					//Factory.create(action["class"])[action["method"]](action["args"]);
				
				}
			}
		);
		
	}
	
	add(args, o, action) {
		
		var interceptionTable = ["image", "file"];
		
		if (interceptionTable.indexOf(args["a"]["name"]) !== -1) {//перехоплюємо виклик методу
			
			runTools.uploadsForm(args, o);
			return false;
			
		}

		var argsAjax = {
			h	:	args["h"],
			a	:	args["a"],
		};
		
		tools.work(1);
		ajax.start(argsAjax, o).then (
		
			function (d) {

				d = ajax.end(d, o);
				tools.work(0);

				construction["lineMan"](d, o, args);

				if (action?.["after"]) {
					
					//console.log(action["after"]);
					//Factory.create(action["class"])[action["method"]](action["args"]);
					var classReady = Factory.create(action["after"]["class"]);
					
					if (classReady) {
						
						if (action["after"]["method"] in classReady) {
							
							classReady[action["after"]["method"]](action["after"]["args"]);
							
						} else {
							
							vNotify.error({text: "JS:" + action["class"] + "::"+action["method"]+" "+library.get("Not Found"),visibleDuration:10000});
							
						}
						
					} else {
						
						vNotify.error({text: "JS: class "+action["class"]+" "+library.get("Not Found"),visibleDuration:10000});
						
					}
				}
				
				if (d.action != undefined) {//дія з серверу
					
					console.log(d.action);return false;
					//Factory.create(action["class"])[action["method"]](action["args"]);
				
				}
			}
			
		);
	}
	
	view(args, o) {
		
		ajax.start(args, o).then(
		
			function(d) {
				//console.log(ajax.end(d, o));
				construction["lineMan"](ajax.end(d, o), o);
				
				if (d.action != undefined) {
					console.log(d.action);return false;
					//Factory.create(action["class"])[action["method"]](action["args"]);
				}
			}
		);
	}

	formAdd (data, args, config, addData, o) {

		var formAction = {
			"h"	:	"exec",
			"a"	:	{
				"name"		:	"rowSave",
				"action"	:	"insert",
				"table"		:	args["a"]["name"],
			},
		}
		
		if (args["a"]?.["config"]) { formAction["a"]["config"] = args["a"]?.["config"];}
		
		var formTag = "form";
		var formAttr = {
			"class"	:	"groups",
			"attr"	:	{
				"method"			:	"post",
				"action"			:	tools.transformObjToStr(formAction),
				"onsubmit"			:	"form.go(this,{'class':'RunTools','method':'formAddReplacedEdit'});return false;",
				"data-first-run"	:	"setFormDynamicValid"
			}
		};
		
		if (args["a"]?.["section"]) {
			
			formTag = "div";
			var formAttr = {
				"class"	:	"groups",
				"attr"	:	{
					"data-type"			:	"form",
					"data-href"			:	"/p/run/" + tools.transformObjToStr(formAction),
					"data-first-run"	:	"setFormDynamicValid"
				}
			};
			
		}

		var groups = element.create(formTag, formAttr);

		if (args["a"]["ID"] == undefined) {//новий рядок
			
			args["a"]["action"] = "rowAdd";
			row.formSetAttr (groups, data, args, config, addData);
			
			var toolbar = null;
			if (data?.["toolbarKit"]?.["rowAdd"]) {
				
				var toolbar = element.create("div",{
					class	:	"toolbar",
				});

				for (var i = 0; i < data["toolbarKit"]["rowAdd"].length; i++) {
					
					toolbar.innerHTML += data["toolbarKit"]["rowAdd"][i].replace(/%7BID%7D/g, args["a"]["ID"]).replace(/{ID}/g, args["a"]["ID"]);
					
				}
				
			}
			
		} else {//копіювання
			
			args["a"]["action"] = "rowCopy";
			row.formSetAttr (groups, data, args, config, addData);
			
			var toolbar = null;
			if(data?.["toolbarKit"]?.["rowCopy"]){
				var toolbar = element.create("div",{
					class	:	"toolbar",
				});

				for(var i = 0; i < data["toolbarKit"]["rowCopy"].length; i++) {
					toolbar.innerHTML += data["toolbarKit"]["rowCopy"][i].replace(/%7BID%7D/g, args["a"]["ID"]).replace(/{ID}/g, args["a"]["ID"]);
				}
			}
		
		}
		
		if (toolbar !== null) {
			groups.prepend(toolbar);
			groups.append(toolbar.cloneNode(true));
		}
		
		return  groups;
	}
	
	rowView (data, args, config, addData, o) {

		var groups = element.create("div",{
			"class"	:	"groups"
		});
		
		row.viewSetData (groups, data, args, config, addData);
		
		var toolbar = null;
		if (data?.["toolbarKit"]?.["rowView"]) {
			
			var toolbar = element.create("div",{
				class	:	"toolbar",
			});

			var html;
			for (var i = 0; i < data["toolbarKit"]["rowView"].length; i++) {
				
				html = data["toolbarKit"]["rowView"][i].replace(/%7BID%7D/g, args["a"]["ID"]).replace(/{ID}/g, args["a"]["ID"]);
				
				toolbar.innerHTML += row.replacedHtmlToolbarKit(html, data);

			}
		}
		
		if(toolbar !== null){
			groups.prepend(toolbar);
			groups.append(toolbar.cloneNode(true));
		}
		
		return  groups; 
	}

	viewSetData (groups, data, args, config, addData) {
		
		var handleElemTranslate = function (elem, l, dataTranslate, nameTranslate) {
			elem.setAttribute("data-l",l);
			if(
				dataTranslate["translate"] != undefined 
				&& dataTranslate["translate"][dataTranslate["fields"][nameTranslate]] != undefined
				&& dataTranslate["translate"][dataTranslate["fields"][nameTranslate]][l] != undefined
				){
				elem.append(dataTranslate["translate"][dataTranslate["fields"][nameTranslate]][l]);
			}
		}
		
		var createElemUrl = function (dataUrl, l, nameTranslate, block) {
			if(nameTranslate == "name" && dataUrl){
				var uInput = element.create("div",{
					"attr"	:	{
						"title"		:	"url-"+l,
						"data-l"	:	l,
						"data-u"	:	1,
					},
				});

				if(dataUrl["url"] != undefined && dataUrl["url"][l] != undefined){
					uInput.append(dataUrl["url"][l]);
				}

				block.append(uInput);
			}
		}
		
		//влупити дані перекладів в data
		if (data?.["translate"]?.["fields"]) {
			
			for (var translateFieldName in data["translate"]["fields"]) {
				
				data["data"]["fakeField-translate-" + translateFieldName] = "";
				
			}
		}

		var block, header, input, tmp, nameTranslate;
		var group = row.createControlsGroup(groups, config);

		for (var name in data["data"]) {
			
			var blockElement = {};
			
			if(config["control"][name]["blockElement"] != undefined){
				blockElement = config["control"][name]["blockElement"];
			}

			blockElement["class"] = "block";
			block = element.create("div",blockElement);
			
			header = element.create("div",{
				"class"	:	"header"
			});
			
			header.innerHTML = config["control"][name]["header"];
			
			input = element.create("div");
			input.append(data["data"][name]);
			
			block.append(header);
			block.append(input);
			
			if (data["translate"]) {
				
				tmp = name.split("-");
				if(tmp.length == 3 && tmp[1] == "translate") {
					
					nameTranslate = tmp[2];
					if (data["translate"]["fields"][nameTranslate] != undefined) {
						
						for (var l in data["translate"]["languages"]) {
							
							if (data["translate"]["languageMain"] != l) {//це додаткова мова
								var lInput = input.cloneNode(true);
								while (lInput.firstChild) {//видаляємі всі дочірні елементи
									lInput.removeChild(lInput.firstChild);
								}
								handleElemTranslate(lInput, l, data["translate"], nameTranslate);
								block.append(lInput);
								createElemUrl(data["url"], l, nameTranslate, block, 1);

							} else {//основна мова
								handleElemTranslate(input, l, data["translate"], nameTranslate);
								createElemUrl(data["url"], l, nameTranslate, block);
							}
						}
					}
				}
			}
			
			row.appendControlsGroup(groups, group, block, name);
		}

		if (
			group
			&& group["block"]
		) {
			let groupClass = group["block"].getAttribute("class");
			if (groupClass) {
				
				switch (groupClass) {
					
					case "tabs":
						tools.tabsInit(group["block"]);
					break;
					
					case "accordion":
						tools.accordionInit(group["block"]);
					break;
					
					case "spoiler":
						tools.spoilerInit(group["block"]);
					break;
				}
				
			}

		}		
	}
		
	formEdit (data, args, config, addData, o) {

		var formAction = {
			"h"	:	"exec",
			"a"	:	{
				"name"		:	"rowSave",//method
				"action"	:	"update",
				"table"		:	args["a"]["name"],
			},
		};
		
		if (args["a"]?.["config"]) { formAction["a"]["config"] = args["a"]?.["config"];}
		
		var formTag = "form";
		var formAttr = {
			"class"	:	"groups",
			"attr"	:	{
				"method"			:	"post",
				"action"			:	tools.transformObjToStr(formAction),
				"onsubmit"			:	"form.go(this);return false;",
				"data-first-run"	:	"setFormDynamicValid"
			}
		};

		if (args["a"]?.["section"]) {
			
			formTag = "div";
			var formAttr = {
				"class"	:	"groups",
				"attr"	:	{
					"data-type"			:	"form",
					"data-href"			:	"/p/run/" + tools.transformObjToStr(formAction),
					//"onsubmit"			:	"form.go(this,{'class':'RunTools','method':'formAddReplacedEdit'});return false;",
					"data-first-run"	:	"setFormDynamicValid"
				}
			};
			
		}
		
		var groups = element.create(formTag, formAttr);
		
		args["a"]["action"] = "rowEdit";
		row.formSetAttr(groups, data, args, config, addData);
		
		var toolbar = null;
		
		if (data?.["toolbarKit"]?.["rowEdit"]) {
			
			var toolbar = element.create("div",{
				class	:	"toolbar",
			});

			var html;
			
			for (var i = 0; i < data["toolbarKit"]["rowEdit"].length; i++) {
				
				html = data["toolbarKit"]["rowEdit"][i].replace(/%7BID%7D/g, args["a"]["ID"]).replace(/{ID}/g, args["a"]["ID"]);
				toolbar.innerHTML += row.replacedHtmlToolbarKit(html, data);

			}
		}
		
		if (toolbar !== null) {
			
			groups.prepend(toolbar);
			groups.append(toolbar.cloneNode(true));
			
		}

		return  groups;

	}
	
	replacedHtmlToolbarKit (html, data) {

		var start = html.indexOf("[start]");
		var end = html.indexOf("[end]");
			
		if (start !== -1 && end !== -1) {
			
			var method = html.substring((start + 7), end).split("|");
			var replaced = row[method[0]](method, data);
			html = html.replace(html.substring(start, (end + 5)), replaced);
			
		}
		return html;
	}
	
	getRowDataFromTranslate (args, data) {

		var r = null;
		
		if (data?.["translate"]?.["translate"]?.[args[1]]?.[args[2]]) {
			
			r = data["translate"]["translate"][args[1]][args[2]];
			
		}
		return r;
	}
	
	formSetAttr (groups, data, args, config, addData) {

		if (config?.["formSetAttr"]?.["start"]) {
			
			var classReady = Factory.create(config["formSetAttr"]["start"]["class"]);
			
			if (classReady) {
			
				if (config["formSetAttr"]["start"]["method"] in classReady) {
					
					classReady[config["formSetAttr"]["start"]["method"]](groups, config?.["formSetAttr"]?.["start"]?.["args"] ? config["formSetAttr"]["start"]["args"] : null);
				
				}

			}

		}
		
		var handleElemTranslate = function (elem, l, dataTranslate, nameTranslate) {
			
			elem.setAttribute("data-l", l);
			
			if (elem.getAttribute("name")) {
				
				elem.setAttribute("name","fakeField-translate-" + dataTranslate["fields"][nameTranslate] + "-" + l);
				
			} else {
				
				elem.setAttribute("data-name","fakeField-translate-" + dataTranslate["fields"][nameTranslate] + "-" + l);
				
			}

			if (
				
				dataTranslate["translate"] != undefined 
				&& dataTranslate["translate"]["f"+dataTranslate["fields"][nameTranslate]] != undefined
				&& dataTranslate["translate"]["f"+dataTranslate["fields"][nameTranslate]]["l"+l] != undefined
			) {
				elem.value = dataTranslate["translate"]["f"+dataTranslate["fields"][nameTranslate]]["l"+l];
				
			} else {
				elem.value = "";
			}
		}
		
		var createAutoTranslateBtn = function (listL, languages, l) {
			
			var toolbar = element.create("div", {"class":["toolbar", "vertical"]});
			var tAction;
			
			for (var i = 0; i < listL.length; i++) {

				tAction = element.create("button", {
					"attr"	:	{
						"type"		:	"button",
						"title"		:	library.get("Translate From") + " "+ languages[listL[i]]["name"]+" to " + languages[l]["name"],
						"onclick"	:	"runTools.translateField(this, "+listL[i]+")",
						"tabindex"	:	-1
					},
					"class"	:	[
						"las", "la-16", "la-language", "small"
					],
					"html"	:	languages[listL[i]]["name"]+"&rarr;"+languages[l]["name"],
				});
				
				toolbar.append(tAction);
			}
			
			return toolbar;
		}
		
		var createElemUrl = function (dataUrl, l, block, tableName, config) {
			
			if (
				dataUrl != undefined
				&& dataUrl["isIndex"] == undefined
			) {

				var uAction = element.create("button",{
					"attr"	:	{
						"type"		:	"button",
						"title"		:	"transliterate Name",
						"onclick"	:	"runTools.transliterateField(this)",
						"tabindex"	:	-1
					},
					"class"	:	[
						"las", "la-16", "h-30", "la-sign-language"
					]
				});
				
				var uInputAttr = {
					"attr"	:	{
						"data-l"	:	l,
						"name"		:	"fakeField-url-url-" + l,
						"data-u"	:	1,
						"title"		:	"url",
					},
				};
				
				var uRInputAttr = {
					"attr"	:	{
						"data-l"	:	l,
						"data-r"	:	1,
						"name"		:	"fakeField-url-robots-" + l,
						"title"		:	"robots",
						'style'		:	"width:300px;",
						"tabindex"	:	-1,
					},
				};
				
				if (
					config?.["control"]?.["fakeField-url-url"]?.["element"]?.["attr"]?.["data-valid"]
				) {
					uInputAttr["attr"]["data-valid"] = config["control"]["fakeField-url-url"]["element"]["attr"]["data-valid"];
				}

				var uInput = element.create("input", uInputAttr);
				var uRInput = element.create("input", uRInputAttr);
				
				if (
					dataUrl?.["url"]?.[l]
				) {
					
					uInput.value = dataUrl["url"][l]["url"];
					uRInput.value = dataUrl["url"][l]["robots"];
					
				}
				
				var line = element.create("div", {"class" : "line"});
				
				line.append(uAction);
				line.append(uInput);
				line.append(uRInput);
				
				block.append(line);
			}


		}
		
		//влупити поля для перекладів в data
		if (data?.["translate"]?.["fields"]) {

			for (var translateFieldName in data["translate"]["fields"]) {
				
				data["data"]["fakeField-translate-" + translateFieldName] = "";
				
			}
		}

		var fields = Object.keys(data["data"]);//порядок слідування полів як в базі + переклади в кінець
		
		if (config?.["controls"]?.["group"]) {//задано групування
			fields = config["controls"]["group"].map(item => item[1]).flat();

		} else {
			if (config?.["controls"]?.["setting"]?.["fields"]) {//встановлено порядок слідування полів в налаштуваннях
				fields = config["controls"]["setting"]["fields"];
			}
		}

		var block, header, input, tmp, nameTranslate, name, tagElementAttr;
		var group = row.createControlsGroup(groups, config);
		
		for (var j = 0; j < fields.length; j++) {
			
			var message = "";
		
			input = null;
			name = fields[j];
			
			header = "";
			var blockElement = {};

			if (config?.["control"]?.[name]?.["blockElement"]) {
				
				blockElement = config["control"][name]["blockElement"];
			
			}

			blockElement["class"] = "block";
			
			block = element.create("div", blockElement);

			if (config?.["control"]?.[name]?.["header"]) {
				
				header = element.create("div",{
					"class"	:	"header"
				});
				
				header.innerHTML = config["control"][name]["header"];
				
			}

			if (config?.["control"]?.[name]?.["message"]) {
				
				message = element.create("div",{
					"class"	:	"message"
				});
				
				message.innerHTML = config["control"][name]["message"];

			}

			tagElementAttr = {};
			
			if (config?.["control"]?.[name]?.["element"]) {
				
				tagElementAttr = config["control"][name]["element"];
				
			}

			if (tagElementAttr["attr"] == undefined) {
				
				tagElementAttr["attr"] = {};
				
			}
			
			tagElementAttr["attr"]["name"] = name;

			if (
				tagElementAttr?.["tag"]
				&& tagElementAttr["tag"] == "select"
			) {

				if (tagElementAttr?.["option"]) {

					if (Object.keys(tagElementAttr["option"])?.[0]) {
						
						var tmp = Object.keys(tagElementAttr["option"])[0].split("::");

						if (tmp.length == 1) {
							
							tagElementAttr["option"] = runTools[Object.keys(config["control"][name]["element"]["option"])[0]](
								Object.values(config["control"][name]["element"]["option"])[0], 
								addData
							);

						} else {
							
							tagElementAttr["option"] = window[tmp[0]][tmp[1]](
								Object.values(config["control"][name]["element"]["option"])[0], 
								addData 
							);
	
						}
					}

				} else { console.log("select need element.option"); }

			}
			
			if (args["a"]["action"] == "rowAdd") {//операції при створенні нового рядку 
				
				if (tagElementAttr["default"] != undefined) {
					data["data"][name] = tagElementAttr["default"];//підмінили при створенні нового рядка
					delete tagElementAttr["default"];

				} else {
					
					if (tagElementAttr?.["defaultAction"]) {
						
						var classReady = Factory.create(tagElementAttr["defaultAction"][0]);
						
						if (classReady) {
						
							if (tagElementAttr["defaultAction"][1] in classReady) {
								
								var defaultValue = classReady[tagElementAttr["defaultAction"][1]](
								
									tagElementAttr["defaultAction"][2],
									block
								
								);

							} else {
								
								vNotify.error({text: "JS: " + config[i][0] + "::"+config[i][1]+" "+library.get("Not Found"),visibleDuration:10000});
							}
						
						} else {
								
							vNotify.error({text: "class "+config[i][0]+" "+library.get("Not Found"),visibleDuration:10000});
								
						}						
						
						delete tagElementAttr["defaultAction"];
						
					}
				}
				
				if (args["a"]?.["filter"]?.[name]) {//встановлення значень полів на основі фільтрів

					if (name != "ID") {//крім ID

						tmp = tools.explode(args["a"]["filter"][name], "|", 2);
						if (tmp.length == 2 && tmp[1]) {//є | і значення не пусте
							
							data["data"][name] = tmp[1];
							
						} else {
							
							data["data"][name] = args["a"]["filter"][name].replace(/=\|/g, "");
							
						}
						
					}
				}
				
			}
			else {//при інших операціях видаляємо default та defaultAction
				
				if (tagElementAttr["default"] != undefined) {
					delete tagElementAttr["default"];
				}
				
				if (tagElementAttr["defaultAction"] != undefined) {
					delete tagElementAttr["defaultAction"];
				}
			}
			

			if (tagElementAttr["attr"]?.["name"] && args["a"]?.["section"]) {
				
				tagElementAttr["attr"]["data-name"] = tagElementAttr["attr"]["name"];
				delete tagElementAttr["attr"]["name"];

			}
			
			block.append(header);

			if (config?.["control"]?.[name]?.["modify"]?.["header"]) { /*(?)*/
				
				row.elementModify(header, config["control"][name]["modify"]["header"]);

			}
			
			var cAfter = null;

			if (tagElementAttr?.["tag"]) {//тег обов'язково

				if (tagElementAttr?.["cBefore"]) {
					
					block.append(element.create("div", {"class":"control", "html":tagElementAttr["cBefore"]}));
					
					delete tagElementAttr["cBefore"];
				
				}
				
				if (tagElementAttr?.["cAfter"]) {
					
					cAfter = element.create("div", {"class":"control", "html":tagElementAttr["cAfter"]});
					
					delete tagElementAttr["cAfter"];
				
				}

				input = element.create(tagElementAttr["tag"], tagElementAttr);
				if (tagElementAttr?.["attr"]?.["data-reaction"]) {
					
					input.addEventListener("input", function (e){reaction.go(e["srcElement"]);});
					input.addEventListener("focus", function (e){reaction.go(e["srcElement"]);});
				
				}

				if (tagElementAttr?.["attr"]?.["type"] && tagElementAttr["attr"]["type"] == "checkbox") {
					
					if (data["data"][name] == 1) {
						
						input.checked = true;
						
					}

				} else {

					if (tagElementAttr?.["multiple"]) {//select multiple
						
						tmp = data["data"][name].toString().split(",");
						var tmp2;
						
						if (input.querySelector("option[value='']")) {
							
							input.querySelector("option[value='']").selected = false;
							
						}

						for (var i = 0; i < tmp.length; i++) {

							if (tmp[i]) {
								
								tmp2 = input.querySelector("option[value='"+tmp[i]+"']");
								
								if (tmp2) {
									
									tmp2.selected = true;//звичайний, або slim
									
									if (tagElementAttr?.["attr"]?.["data-addon"] && tagElementAttr["attr"]["data-addon"] == "selectr") {
										tmp2.setAttribute("selected", "selected");
									}
									
									
								}
							}
						}
					} else {

						if (data?.["data"]?.[name]) {
							input.value = data["data"][name];
						}

					}
				}
			}

			if (input) {

				block.append(input);

				if (
					args["a"]?.["section"] 
					&& input.tagName == "INPUT"
				) {
					
					input.addEventListener("keypress", function() {
						
						if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
							
							event.preventDefault();

							var saveBtn = event.target.closest("[data-type='form']").querySelector("[data-action='row-save']");
							
							if (saveBtn) {
								saveBtn.click();
							}

						}
						
					});
				}
				
				if (cAfter !== null) {
					
					block.append(cAfter);
					
				}
				
				if (tagElementAttr?.["attr"]?.["data-addon"]) {

					switch (tagElementAttr["attr"]["data-addon"]) {
						
						case "slim":
						
							if (tagElementAttr["multiple"] != undefined) {
								
								var select = new SlimSelect({
									select			:	input,
									closeOnSelect	:	false,
									events			:	{
										afterChange	:	(newVal) => {
											console.log(newVal);
										}
									}
								});

							} else {
								
								var select = new SlimSelect({
									select	:	input,
								});
								
							}
							
						break;
						
						case "editor":

							switch (config["editor"]) {
								
								case "1":
									runTools.editorEDInit(input);

								break;
								
								case "2":
								
									if (!name.includes("-")) {//без перекладів
										
										runTools.editorPellInit(input);
										
									}
									
								break;
							}
							
							
							
						break;
						
						case "selectr":
						
							if (tagElementAttr?.["multiple"]) {
								
								console.log("var select = new Selectr");
								var select = new Selectr(input, {

								});
								
								/*var select = new SlimSelect({
									select			:	input,
									closeOnSelect	: false
								});*/

							} else {
								
								new Selectr(input);

								/*var select = new SlimSelect({
									select	:	input,
								});*/
								
							}
							
						break;
					}
					
					/*input.removeAttribute("data-addon");
					delete tagElementAttr["attr"]["data-addon"];*/
					
				}

				if (tagElementAttr?.["attr"]?.["data-append-action"]) {
					
					var $appendAction = tagElementAttr["attr"]["data-append-action"];
					input.removeAttribute("data-append-action");
					
					var $tmp = $appendAction.split("::");
					
					var classReady = Factory.create($tmp[0]);

					if (classReady) {

						if ($tmp[1] in classReady) {
							
							classReady[$tmp[1]](input, data);

						}
					
					}
					
				}
				
				if (data?.["translate"]) {

					tmp = name.split("-");

					if (tmp.length == 3 && tmp[1] == "translate") {

						nameTranslate = tmp[2];

						if (data["translate"]?.["fields"]?.[nameTranslate] != undefined) {
							
							var l;

							var listL = data["translate"]["lOrder"];
							
							for (var i = 0; i < listL.length; i++) {

								l = data["translate"]["lOrder"][i];

								if (data["translate"]["languageMain"] != l) {//це не основна мова
									
									var lInput = input.cloneNode(true);
									
									if (
										args["a"]?.["section"] 
										&& lInput.tagName == "INPUT"
									) {
										
										lInput.addEventListener("keypress", function() {
											
											if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
												
												event.preventDefault();
												var saveBtn = input.closest("[data-type='form']").querySelector("[data-action='row-save']");
												
												if (saveBtn) {
													saveBtn.click();
												}

											}
											
										});
									}
									
									if (tagElementAttr?.["attr"]?.["data-reaction"]) {
										
										lInput.addEventListener("input", function (e){reaction.go(e["srcElement"]);});
										lInput.addEventListener("focus", function (e){reaction.go(e["srcElement"]);});
										
									}
									
									if (tagElementAttr["attr"] != undefined && tagElementAttr["attr"]["data-focus"] != undefined) {
										
										lInput.removeAttribute("data-focus");
										
									}
									
								} else {//основна мова
									
									var lInput = input;
									
								}
								
								handleElemTranslate(lInput, l, data["translate"], nameTranslate);
								

								
								if (
									config["autoTranslate"] != undefined 
									&& config["autoTranslate"]
								) {
									
									var line = element.create("div");
									line.classList.add("line");
									/*line.classList.add("alignItemsCenter");*/
									var listLExcluded = listL.filter(language => language != l);
									var autoTranslateBtn = createAutoTranslateBtn(listLExcluded, data["translate"]["languages"], l);
									
									line.append(autoTranslateBtn);
									line.append(lInput);
									
									block.append(line);
									
								} else {
									
									block.append(lInput);
									
								}
								
								if (nameTranslate == "name") {

									createElemUrl(data["url"], l, block, args["a"]["name"], config);
								
								}
								
								var needAddon = input.getAttribute("data-addon");
								if (needAddon && needAddon == "editor") {
									
									switch (config["editor"]) {
										
										case "2":
										
											runTools.editorPellInit(lInput, true);
											
										break;
									}
									
								}
								
							}
						}
					}
				}
				
				if (config?.["control"]?.[name]?.["modify"]?.["element"]) {
					
					row.elementModify(input, config["control"][name]["modify"]["element"]);

				}
				
			}

			if (message) {
				block.append(message);
			}
			
			if (config?.["control"]?.[name]?.["modify"]?.["blockElement"]) {
				row.elementModify(block, config["control"][name]["modify"]["blockElement"]);
			}
			
			if (
				config?.["control"]?.[name]?.["blockElement"]?.["htmlBefore"]
				|| config?.["control"]?.[name]?.["blockElement"]?.["htmlAfter"]
				
			) {
				// Зберігаємо посилання на оригінал
				const originalBlock = block;
				// Функція для створення HTML
				const html = (str) => document.createRange().createContextualFragment(str);

				block = document.createDocumentFragment();
				if (config?.["control"]?.[name]?.["blockElement"]?.["htmlBefore"]) {
					block.appendChild(html(config["control"][name]["blockElement"]["htmlBefore"]));
					
				}
				block.appendChild(originalBlock);

				if (config?.["control"]?.[name]?.["blockElement"]?.["htmlAfter"]) {
					block.appendChild(html(config["control"][name]["blockElement"]["htmlAfter"]));
				}
			}
			
			row.appendControlsGroup(groups, group, block, name);
			
		}

		if (
			group
			&& group["block"]
		) {
			let groupClass = group["block"].getAttribute("class");
			if (groupClass) {

				switch (groupClass) {
					
					case "tabs":
						tools.tabsInit(group["block"]);
					break;
					
					case "accordion":
						tools.accordionInit(group["block"]);
					break;
					
					case "layers":
						tools.spoilerInit(group["block"]);
					break;
				}
				
			}

		}

		if (config?.["formSetAttr"]?.["end"]) {

			var classReady = Factory.create(config["formSetAttr"]["end"]["class"]);

			if (classReady) {
			
				if (config["formSetAttr"]["end"]["method"] in classReady) {
					
					classReady[config["formSetAttr"]["end"]["method"]](groups, config?.["formSetAttr"]?.["end"]?.["args"] ? config["formSetAttr"]["end"]["args"] : null);
				
				}

			}

		}

	}
	
	elementModify (elem, config) {

		var classReady = Factory.create(config[0]);
		
		if (classReady) {
		
			if (config[1] in classReady) {
				
				elem = classReady[config[1]](
				
					config[2],
					elem
				
				);

			} else {
				
				vNotify.error({text: "JS: " + config[0] + "::"+config[1]+" "+library.get("Not Found"),visibleDuration:10000});
			}
		
		} else {
				
			vNotify.error({text: "class "+config[0]+" "+library.get("Not Found"),visibleDuration:10000});
				
		}

		return elem;
		
	}

	createControlsGroup(groups, config) {//реалізація групування - частина 1, початок
		
		if (
			config?.["controls"]?.["type"]/*тип, обов'язково*/
		) {
			
			switch (config["controls"]["type"]) {
				
				case "tabs":
					
					return row.createControlsGroupTabs(groups, config);
					
				break;
				
				case "accordion":
					
					return row.createControlsGroupAccordion(groups, config);
					
				break;
				
				case "spoiler":
					
					return row.createControlsGroupSpoiler(groups, config);
					
				break;
				
				case "group":
					
					return row.createControlsGroupGroup(groups, config);
					
				break;
				
			}

		}

	}
	
	createControlsGroupTabs(groups, config) {

		let group, type, div, opened = null, i , j, jj = 0, headerDivAttr, bodyDiv, bodyDivAttr, bodyChildDiv;

		type = config["controls"]["type"];
		group = config["controls"]["group"];

		if (config?.["controls"]?.["setting"]?.["opened"]) {
			opened = config["controls"]["setting"]["opened"][0];
		}

		let r = {
			list	:	{},
			block	:	element.create("div", {"class" : type}),
		};

		groups.append(r["block"]);
		
		let header = element.create("div", {
			"class"	:	"header",
		});
		r["block"].append(header);
		
		let body = element.create("div", {
			"class"	:	"body",
		});
		
		r["block"].append(body);
		
		for (i = 0; i < group.length; i++) {/*обходимо групи*/

			for (j = 0; j < group[i][1].length; j++) {
				
				r["list"][group[i][1][j]] = jj;//місце знаходження елементу в групі
				
			}
			
			headerDivAttr = {
				"html"	:	group[i][0],
			};
			bodyDivAttr = {

			};
			
			if (
				opened !== null
				&& opened == i 
			) {

				headerDivAttr["class"] = "show";
				bodyDivAttr["class"] = "show";
			}
			
			bodyChildDiv = element.create("div", {
				attr:	{
					"data-order"	:	i,
				},
			});
			
			bodyDiv = element.create("div", bodyDivAttr);
			bodyDiv.append(bodyChildDiv);
			
			header.append(element.create("div", headerDivAttr));

			body.append(bodyDiv);
			
			++jj;
			
		}

		return r;
	}
	
	createControlsGroupAccordion(groups, config) {
		
		let group, type, opened = null, i , j, jj = 0, div, divAttr, headerDivAttr, bodyDiv, bodyDivAttr, bodyChildDiv;

		type = config["controls"]["type"];
		group = config["controls"]["group"];

		if (config?.["controls"]?.["setting"]?.["opened"]) {
			opened = config["controls"]["setting"]["opened"];
		}

		let r = {
			list	:	{},
			block	:	element.create("div", {"class" : type}),
		};

		groups.append(r["block"]);

		for (i = 0; i < group.length; i++) {/*обходимо групи*/

			divAttr = null;
			if (
				opened !== null
				&& opened.includes(i) 
			) {

				divAttr = {
					"class" : "show",
				};
			}
			div = element.create("div", divAttr);
			
			r["block"].append(div);

			for (j = 0; j < group[i][1].length; j++) {
				
				r["list"][group[i][1][j]] = jj;//місце знаходження елементу в групі
				
			}
			
			headerDivAttr = {
				"class"	:	"header",
				"html"	:	group[i][0],
			};
			bodyDivAttr = {
				"class"	:	"body",
			};
			
			bodyChildDiv = element.create("div", {
				attr:	{
					"data-order"	:	i,
				},
			});
			
			bodyDiv = element.create("div", bodyDivAttr);
			bodyDiv.append(bodyChildDiv);
			
			div.append(element.create("div", headerDivAttr));
			div.append(bodyDiv);
			
			++jj;
			
		}
		
		return r;
	}
	
	createControlsGroupSpoiler(groups, config, data) {
		
		let group, type, opened = null, i , j, jj = 0, div, divAttr, headerDivAttr, bodyDiv, bodyDivAttr, bodyChildDiv;

		type = config["controls"]["type"];
		group = config["controls"]["group"];

		if (config?.["controls"]?.["setting"]?.["opened"]) {
			opened = config["controls"]["setting"]["opened"];
		}

		let r = {
			list	:	{},
			block	:	element.create("div", {
				"class"	:	"layers"
			}),
		};

		groups.append(r["block"]);

		for (i = 0; i < group.length; i++) {/*обходимо групи*/

			divAttr = {
				"class" : "spoiler",
			};
			if (
				opened !== null
				&& opened.includes(i) 
			) {

				divAttr = {
					"class" : ["spoiler", "show"],
				};
			}
			
			div = element.create("div", divAttr);
			
			r["block"].append(div);

			for (j = 0; j < group[i][1].length; j++) {
				
				r["list"][group[i][1][j]] = jj;//місце знаходження елементу в групі
				
			}
			
			headerDivAttr = {
				"class"	:	"header",
				"html"	:	group[i][0],
			};
			
			bodyDivAttr = {
				"class"	:	"body",
			};
			
			bodyChildDiv = element.create("div", {
				attr:	{
					"data-order"	:	i,
				},
			});
			
			bodyDiv = element.create("div", bodyDivAttr);
			bodyDiv.append(bodyChildDiv);
			
			div.append(element.create("div", headerDivAttr));
			div.append(bodyDiv);
			
			++jj;
			
		}
		
		return r;
	}
	
	createControlsGroupGroup(groups, config, data) {
		
		let group, type, i , j, jj = 0, div, divAttr, headerDivAttr, bodyDivAttr;

		type = config["controls"]["type"];
		group = config["controls"]["group"];

		let r = {
			list	:	{},
			block	:	element.create("div", {
				"class"	:	"layers"
			}),
		};

		groups.append(r["block"]);

		for (i = 0; i < group.length; i++) {/*обходимо групи*/

			div = element.create("div", {"class" : "group"});
			
			r["block"].append(div);

			for (j = 0; j < group[i][1].length; j++) {
				
				r["list"][group[i][1][j]] = jj;//місце знаходження елементу в групі
				
			}
			
			headerDivAttr = {
				"class"	:	"header",
				"html"	:	group[i][0],
			};
			bodyDivAttr = {
				"class"	:	"body",
				attr:	{
					"data-order"	:	i,
				}
			};
			
			div.append(element.create("div", headerDivAttr));
			div.append(element.create("div", bodyDivAttr));
			

			++jj;
			
		}
		
		return r;
	}
	
	appendControlsGroup(groups, group, block, name) {//реалізація групування - частина 2, кінець

		let order;
		if (
			group
			&& group?.["block"]
		) {

			let blocks = group["block"].querySelectorAll("div[data-order]");
			order = parseInt(group["list"][name]);

			if (
				!isNaN(order)
				&& blocks?.[order]
			) {

				blocks[order].append(block);

			}

		} else {//просто врізаємо div без групування
			groups.append(block);
		}
	}
	
	cancelAddCopy(o) {
		
		o.closest("tr").remove();
		
	}
	
}

class Report {
	
	go(args, o) {
		
		var argsAjax = {
			h	:	args["h"],
			a	:	args["a"],
		};

		tools.work(1);

		ajax.start(argsAjax).then(
		
			function(d) {

				d = ajax.end(d); tools.work(0);
				if (d?.["info"]?.["success"]) {
					
					let header = args["a"]["name"] + ", " + library.get("Report");
					let title = document.querySelector("title").getAttribute("data-text");
					
					if (d?.["args"]?.["a"]?.["title"]) {
						header = d["args"]["a"]["title"].replace(/(<([^>]+)>)/gi, "");
					}
					document.title = header + " | " + title;
				
					construction["lineMan"](d, o, args);
				} else {
					
					if (d?.["info"]?.["text"]) {
						vNotify.error({text: "Report::"+args["a"]["name"]+". "+d["info"]["text"], visibleDuration:10000});
					}

				}


			}
		);
	}

}

class Construction {
	
	lineMan(d, o, args) {

		if (d?.["info"]?.["success"] && d?.["data"]) {
			
			var tmp, classReady, e;
	
			for (var place in d["data"]) {

				tmp = d["data"][place][0].split("::");//тільки такий запис повинен бути 
				
				if (tmp?.[1]) {//є class::method
					
					if (args?.["a"]?.["section"] && args["section"] == undefined) {

						args["section"] = o.closest("section");
						
					}

					e = element.go(place, o, args);

					if (e !== null) {/*знайшли елемент для врізки*/
						
						classReady = Factory.create(tmp[0]);
						
						if (classReady) {
						
							if (tmp[1] in classReady) {

								var content = classReady[tmp[1]](d["data"][place][1], d["args"], d["config"], d["addData"], e);

								if (content) {
									element["innerAppend"](e, content);

								} else {//очищуємо

									if ((tmp[0] != "Table" && tmp[1] != "trReload") || place == "eArticleAfter") {
										
										/*тут маємо проблему в формуванні tr - refactoring*/
										
										e.innerHTML = content;


										while (e.firstChild) {//видаляємі всі дочірні елементи
											e.removeChild(e.firstChild);
										}
									}
								}
								
							} else {
								vNotify.error({text: tmp[0]+"::"+tmp[1]+" "+library.get("Not Found"),visibleDuration:10000});
							}
							
						} else {
							vNotify.error({text: library.get("Class")+" "+tmp[0]+" "+library.get("Not Found"),visibleDuration:10000});
						}
						
					}
					
				}
				
			}

		} else {
			if (d?.["info"]?.["text"]) {
				vNotify.error({text: d["info"]["text"],visibleDuration:5000});
			}
		}
	}
	
	directly(data) {//прямо так і передаємо
		return data;
	}
	
}

class Element {
	
	go (place, o, args) {

		var res = null;
		
		if (place.indexOf("#e") === 0) {//елемент по id
			
			res = document.querySelector(place);
			
		} else  {
			
			if (place+"Create" in element) {
				
				res = element[place+"Create"](o, args);
				
			} else {
				
				console.log(elemDesc+" - елемент треба найти/створити/інше функцією");
				
			}
		}
		
		return res;
	}
	
	create(type, attr) {
		
		if (type) {

			var elem = document.createElement(type);
			elem = element.attrAdd(elem, attr);
			return elem;
		}
		
		return null;
	}

	attrAdd(elem, attr){//обходчик елементу
		
		if (attr != undefined) {

			for (var type in attr) {
				
				if (type+"Set" in element) {
					
					element[type+"Set"](elem, attr[type]);
					
					
				} else {
					
					console.log(type+"Set: такого методу не існує", elem);
				}
				
			}
			
		}
		
		return elem;
	}	
	
	innerAppend(e, content) {
		
		e.classList.add("translucent");
		
		if (typeof content == "string") {//ready HTML
			
			e.innerHTML = content;
			
		} else {//object
			
			while (e.firstChild) {//видаляємі всі дочірні елементи
				e.removeChild(e.firstChild);
			}
			
			e.append(content);
			
			runTools.formSetFocusElem(e);
			runTools.formSetTabTextarea(e);
		}

		setTimeout (function() {
			e.classList.remove("translucent");
		}, 100);
	}	

	layerCreate(section, dataID) {
		
		var layer = section.querySelector("[data-id='"+dataID+"']");
		
		if (!layer) {
			
			var layer = element.create("div", {
				"attr"	:	{
					"data-id"	:	dataID
				}
			});
			
			section.append(layer);
		}
		
		return layer;
	}
	
	eHeaderAfterCreate(o, args) {

		var res = null;
		
		if (args?.["section"]) {

			res = element.layerCreate(args["section"], "eHeaderAfter");
			
		} else {
			
			res = document.querySelector("header [data-id='eHeaderAfter']");
			
		}
		
		return res;
	}
		

	
	eArticleCreate(o, args) {

		var res = null;
		
		if (args?.["section"]) {

			res = element.layerCreate(args["section"], "eArticle");
			
		} else {
			
			res = document.getElementById("content").querySelector("[data-id='eArticle']");
			
		}
		
		return res;
	}

	eArticleBeforeCreate(o, args) {

		var res = null;
				
		if (args?.["section"]) {
			
			res = element.layerCreate(args["section"], "eArticleBefore");
			
		} else {

			res = document.getElementById("content").querySelector("[data-id='eArticleBefore']");
		}
		
		return res;
	}

	eArticleAfterCreate(o, args) {

		var res = null;
				
		if (args?.["section"]) {
			
			res = element.layerCreate(args["section"], "eArticleAfter");
			
		} else {
			
			res = document.getElementById("content").querySelector("[data-id='eArticleAfter']");
		
		}
		
		return res;
	}

	eASideCreate (o, args) {

		var res = null;
				
		if (args?.["section"]) {
			
			res =  element.layerCreate(args["section"], "eASide");
			
		} else {
			
			res =  document.getElementById("content").querySelector("[data-id='eASide']");
		
		}
		
		return res;
	}

	eContentAfterCreate(o, args) {

		var res = null;
				
		if (args?.["section"]) {
			
			res =  element.layerCreate(args["section"], "eContentAfter");
			
		} else {
			
			res =  document.getElementById("content").querySelector("[data-id='eContentAfter']");
		
		}
		
		return res;
	}

	someTrCreate(o) {
		
		var tr = o.closest("tr");
		if (tr) {
			while (tr.firstChild) {//видаляємо всі дочірні елементи
				tr.removeChild(tr.firstChild);
			}
		}
		return tr;
	}

	aboveTrCreate(o) {

		var tr = o.closest("tr");
		var trAbove = tr.previousElementSibling;
		
		if (trAbove) {
			
			tr.remove();
			
			while (trAbove.firstChild) {//видаляємо всі дочірні елементи
				trAbove.removeChild(trAbove.firstChild);
			}
		}
		return trAbove;
	}
	
	innerTrCreate(o) {//створити елемент всередині рядку (для row-edit, row-view)
		var tr = o.closest("tr");
		if (tr) {
			var colspan = tr.querySelectorAll("td").length;

			while (tr.firstChild) {//видаляємо всі дочірні елементи
				tr.removeChild(tr.firstChild);
			}
			
			var td = document.createElement("td");
			td.setAttribute("colspan",colspan);
			
			td.classList.add("inner");
			tr.append(td);
			
			return td;
		}
	}
	
	underTrCreate (o) {//створити елемент під рядком (для row-edit, row-view)

		var tr = o.closest("tr");//поточний рядок

		if (tr) {
			
			var trUnder = element.create("tr");
			
			var tmpPlace = tr.closest("tbody");
			if (!tmpPlace) {
				tmpPlace = tr.closest("thead");
			}
			
			if (tmpPlace) {
				
				tmpPlace.insertBefore(trUnder, tr.nextSibling);
				
			}

			var colspan = tr.querySelectorAll("td").length;

			var td = document.createElement("td");
			td.setAttribute("colspan",colspan);
			
			td.classList.add("inner");
			trUnder.append(td);
			
			return td;
		}

	}
	
	aboveRowCreate (o) {//створити елемент над рядком для row-copy та для row-add
		

		var tableTHead = o.closest("table").querySelector("thead");

		if (tableTHead) {

			var trHeadTd = tableTHead.querySelectorAll("tr:last-child th");
			var colspan = trHeadTd.length;
			var tr = document.createElement("tr");
			var td = document.createElement("td");
			td.setAttribute("colspan",colspan);
			td.classList.add("inner");
			
			tr.append(td);
			tableTHead.prepend(tr);
			
			tools.scrollIt(tools.getOffset(tr)["top"]-100, 200);

			return td;
			
		}
	}



	someInnerRowCreate (o) {//tr.inner div елемент всередині рядку (для row-reload)
		
		var td = o.closest("tr").querySelector("td.inner");
		if (td) {

			while (td.firstChild) {//видаляємо всі дочірні елементи
				td.removeChild(td.firstChild);
			}

			return td;
		}
	}
	
	attrSet(elem, attr) {
		
		if (attr !== null) {
			var keys = Object.keys(attr);
			for (var i = 0; i < keys.length; i++) {
				elem.setAttribute(keys[i], attr[keys[i]]);
			}
		}
	}
	
	classSet (elem, attr){
		if(Array.isArray(attr)){
			for (var i = 0; i < attr.length; i++){
				elem.classList.add(attr[i]);
			}
		} else {
			elem.classList.add(attr);
		}
	}
	
	htmlSet (elem, attr){
		elem.innerHTML = attr;
	}
	
	optionSet (elem, attr) {

		if (attr !== null) {
			
			var oAttr;

			for (let i = 0; i < attr.length; i++) {
				
				oAttr = {};
				
				for (let key in attr[i]) {
					
					oAttr[key] = attr[i][key];
					
				}

				elem.append(element.create("option", oAttr));
			}

		}
	}
	
	valueSet (elem, attr){
		elem.value = attr;
	}
	
	tagSet (elem, attr){//фейковий метод

	}
	
	selectedSet (elem, attr){
		
		if(attr === true){
			elem.selected = true;
		}
	}
	
	checkedSet (elem, attr){
		if(attr === true){
			elem.checked = true;
		}
	}
	
	requiredSet (elem, attr){
		if(attr === true){
			elem.required = true;
		}
	}
	
	readonlySet (elem, attr) {
		if(attr === true) {
			elem.readOnly = true;
		}
	}
	
	disabledSet (elem, attr) {
		if (attr === true) {
			elem.disabled = true;
		}
	}
	
	multipleSet (elem, attr){
		if (attr === true) {
			elem.multiple = true;
		}
	}
	
	titleSet (elem, attr) {

		if (attr) {
			elem.title = attr;
		}
	}	
	
	htmlBeforeSet (elem, attr) {
	}
	
	htmlAfterSet (elem, attr) {

	}
}

class RunTools {
	
	formSetFocusElem (o) {
		
		var focusElem = o.querySelector("[data-focus='1']");
		if (focusElem) {

			switch (focusElem.tagName) {
				
				case "SELECT":
					focusElem.focus();
				break;
				
				case "DIV": /*translate*/
					let input = focusElem.querySelector("input");
					
					if (input) {
						
					} else {
						
						input = focusElem.querySelector("textarea");
					}
					
					if (input) {
						input.focus();
					}

				break;
				
				default:/*input*/
					focusElem.select();
			}
		}	
	}
	
	formSetTabTextarea (o) {
		
		var tabElems = o.querySelectorAll("textarea[data-tab='1']")
		if(tabElems.length){
			for (var i = 0; i < tabElems.length; i++){
				runTools.enableTab(tabElems[i]);
			}
		}
	}
	
	enableTab (o) {//включение табуляции в textarea
		
		o.onkeydown = function(e) {
			
			if (e.keyCode === 9) { // tab was pressed
				// get caret position/selection
				var val = this.value,
				start = this.selectionStart,
				end = this.selectionEnd;
				// set textarea value to: text before caret + tab + text after caret
				this.value = val.substring(0, start) + '\t' + val.substring(end);
				// put caret at right position again
				this.selectionStart = this.selectionEnd = start + 1;
				// prevent the focus lose
				return false;
			}
			
		};
	}

	filterToggle(o) {
		
		var aSideStateCheckbox = document.getElementById("filter-panel");
		var filterLabel = document.querySelector("header [data-action='filter-toggle']");
		
		if (aSideStateCheckbox.checked) {
			
			aSideStateCheckbox.checked = false;
			filterLabel.classList.remove("active");
			
		} else {//показати фільтри
			
			var tMenuCheckbox = document.getElementById("tm-0");
			
			if (tMenuCheckbox && tMenuCheckbox.checked) {
				
				tMenuCheckbox.checked = false;
			}
				
			aSideStateCheckbox.checked = true;
			filterLabel.classList.add("active");

		}
	}
	
	eArticleImageShowToggle(o) {
		/**
		 * Перемикає видимість(розмір) зображень у статтях (eArticle).
		 * Змінює стан кнопки та показує/ховає всі зображення в таблицях статей
		 * в межах поточного контексту (модальне вікно або основний контент).
		 */
		const newState = o.dataset.state !== "1";
		
		o.dataset.state = newState ? "1" : "0";
		o.classList.toggle("primary", newState);
		
		const container = o.closest("[data-id='eHeaderAfter']").parentElement;
		const isModal = container.tagName === "SECTION";
		
		const context = isModal ? container : document.querySelector("#content article");
		const imageDivs = context?.querySelectorAll("[data-id='eArticle'] table[data-name] .toolbar div.image") || [];
		
		imageDivs.forEach(div => div.classList.toggle("show", newState));
	}
	
	checkedTable(o) {
		
		var tbodyCh = o.closest("table").querySelectorAll("tbody td > .line > input[type=checkbox]");//чекбокси рядків
		var listID = [];//список ID через кому для зручності
		var tr;
		if (tbodyCh) {
			for (var i in tbodyCh) {
				if (!isNaN(i)) 	{
					tbodyCh[i].checked = o.checked;
					tr = tbodyCh[i].closest("tr");
					if(o.checked){
						tr.classList.add("selected");
						listID.push(tr.getAttribute("data-id"));
					} else {
						tr.classList.remove("selected");
					}
				}
			}
		}

		runTools.viewListIDCheckedTableRow(listID, o);

	}

	checkedTableRow(o) {
		
		var tbodyCh = o.closest("table").querySelectorAll("td > .line > input[type=checkbox]");//чекбокси рядків
		var listID = [];//список ID через кому для зручності
		var tr;

		var hiddens = o.closest("div.line").querySelectorAll("[data-mode=hidden]");
		
		if (o.checked) {
			o.closest("tr").classList.add("selected");
			if(hiddens){
				hiddens.forEach(function (elem) {
					elem.classList.remove("displayNone");
				});
			}

		} else {
			o.closest("tr").classList.remove("selected");
				hiddens.forEach(function (elem) {
					elem.classList.add("displayNone");
				});
		}
		if (tbodyCh) {
			for (var i in tbodyCh) {
				if (!isNaN(i) && tbodyCh[i].checked) {
					listID.push(tbodyCh[i].closest("tr").getAttribute("data-id"));
				}
			}
		}
		runTools.viewListIDCheckedTableRow(listID, o);
	}
	
	viewListIDCheckedTableRow(listID, o) {

		var isID = o.closest("[data-id=eArticle]").id;

		if (isID) {//in toRow

			var hiddensLine = o.closest("[data-id=eArticle]").previousElementSibling.querySelectorAll("[data-mode=hidden]");
			
		} else {//is mainTable
			
			var hiddensLine = document.querySelectorAll("[data-id=eHeaderAfter] [data-mode=hidden]");

		}
		
		var hiddensBtn = o.closest("table[data-name]").querySelectorAll("thead [data-mode=hidden]");
		var hiddens = Array.prototype.concat.call(...hiddensLine , ...hiddensBtn);
		
		var checkboxAll = o.closest("table").querySelector("thead input[type=checkbox]");
		var tableName = o.closest("table").getAttribute("data-name");
		
		var listIDBlock = document.querySelector("[data-id='eListID'][data-table='" + tableName + "']");

		if (listID.length > 0) {
			
			if(listIDBlock){
				
				var text = listID.join(",");
				listIDBlock.innerHTML = "<label><input onclick='tools.toClipboard(this.value)' value='" + text + "' readonly><i class='la la-16 la-copy h-20'></i><span class='count'>" + listID.length +"</span></label>";
				
			}

			if (hiddens) {
				
				hiddens.forEach(function (elem) {
					
					elem.classList.remove("displayNone");
					
				});
				
			}
			

		} else {
			
			if (listIDBlock){
				
				listIDBlock.innerHTML = "";
				
			}
			
			if (hiddens){
				
				hiddens.forEach(function (elem) {
					
					elem.classList.add("displayNone");
					
				});
			}
			
			if (checkboxAll) {
				
				checkboxAll.checked = false;
				
			}
		}

	}
	
	optionGetFromAddData(name, addData) {

		var res = [{
			"value"	:	"",
			"html"	:	"—",
		}];
		
		let html, title = "";

		
		if (addData?.[name]) {

			for (var i = 0; i < addData[name][0].length; i++) {

				if (Array.isArray(addData[name][1][i])) {
					html = addData[name][1][i][0];
					title = addData[name][1][i][1];
				} else {
					html = addData[name][1][i];
					title = "";
				}
				
				res.push({
					"value"	:	addData[name][0][i],
					"html"	:	html,
					"title"	:	title,
				});
				
			}
		}

		return res;
		
	}
	
	clearBlockInput(o) {//очищаємо значення в input або select блока
		var inputs = o.closest(".block").querySelectorAll("input[name], select[name], textarea[name]");
		if(inputs){
			for (let i = 0; i < inputs.length; i++) {
				switch (inputs[i].tagName){
					case "SELECT":
						if(inputs[i].options != undefined && inputs[i].options[0] != undefined){
							inputs[i].options[0].selected = true;
						}
					break;
					
					default:
						inputs[i].value = "";
				}
			}
			o.classList.add("displayNone");
		}
	}	
	
	viewSVGInModal(o) {

		tools.toModal ({
			"header"	:	"View"+" "+"SVG",
			"target"	:	"1",
			"html"		:	"<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='"+o.getAttribute("viewBox")+"' style='width:50vw;height:50vh'>"+o.innerHTML+"</svg>"
		});
	}
	
	setTableSortable(o) {
		
		var state = o.getAttribute("data-state");
		var tableBody = document.querySelector("table[data-name='"+o.getAttribute("data-name")+"'] > tbody");
		if(state === null || state  == 0){// выключено - включаем
			tableBody.classList.add("sortable");
			o.classList.add("secondary");
			o.nextElementSibling.classList.remove("displayNone");
			o.nextElementSibling.classList.add("primary");
			o.setAttribute("data-state", 1);
			sortable.enableDragSort(tableBody);
		} else {//выключаем
			runTools.setTableNotSortable(tableBody, o);
		}

	}
	
	setTableNotSortable(tableBody, o) {
		
		tableBody.classList.remove("sortable");
		o.classList.remove("secondary");
		o.nextElementSibling.classList.add("displayNone");
		o.nextElementSibling.classList.remove("primary");
		o.setAttribute("data-state", 0);
		sortable.disableDragSort(tableBody);
		
	}

	generateUserPassword(o) {
		
		var input = o.closest("div").querySelector("input");
		input.value = tools.generatePassword (
			10,
			"!;%:?*+=-/\<>,.1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
		);
		
	}
	
	encryptUserPassword(o) {
		
		var password = o.closest("div").querySelector("input").value;
		
		if (password) {
			var args = {
				h	:	"exec",
				a	:	{
					"name"		:	"encryptUserPassword",//method
					"password"	:	password,
				}
			};
			var hashInput = o.closest("div.block").querySelector("input[name]");
			hashInput.value = "";
			
			tools.work(1);
			
			ajax.start(args, o).then(
				function(d){
					d = ajax.end(d, o); tools.work(0);
					
					if(d["info"]["success"]){
						hashInput.value = d["data"]["hash"];
					} else {
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					}
				}
			);
			
		} else {
			vNotify.error({text: "Password Empty"});
		}
	}
	
	saveCloseRowEdit(o) {

		form.go(o.closest("form"), {"class":"RunTools","method":"rowClose"});

	}
	
	saveCloseSectionRowAddCopy (o) {
		
		runTools.saveSectionRowAddCopy(o, true);
		
	}
	
	saveSectionRowAddCopy (o, close) {
		
		var formO = o.closest("[data-type='form']");
		
		if (formO) {
			
			var data = form.returnData(formO);
			
			if (data !== null) {//можлива валідацію пройшла успішно та є дані з форми
				
				var args = formO.getAttribute("data-href");
				args = tools.transformStrToObj(args.split("/")[3]);
				args["data"] = data;
				
				ajax.start(args, o).then(
				
					function(d) {
						
						d = ajax.end(d, o);
						
						if (d["info"]["success"]) {
							
							if(d["info"]?.["text"]) {
								
								vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
								
							}
							
							if (close != undefined && close) {//save&close
								
								runTools.formAddReplaceTR (args, o, d);
								
							} else {//save
								
								runTools.formAddReplacedEdit (args, o, d);
							}
							
						} else {
							
							vNotify.error({text: d["info"]["text"],visibleDuration:10000});
							
						}

					}
					
				);
			}

		}	
	}
	
	saveCloseSection(o) {
		
		runTools.saveSection(o, true);
		
	}
		
	saveSection(o, close) {

		var formO = o.closest("[data-type='form']");
		
		if (formO) {
			
			var data = form.returnData(formO);

			if (data !== null) {//можлива валідацію пройшла успішно та є дані з форми
				
				var args = formO.getAttribute("data-href");
				args = tools.transformStrToObj(args.split("/")[3]);
				args["data"] = data;
				//console.log(args);return false;
				
				tools.work(1);
				ajax.start(args, o).then(
				
					function(d) {
						
						d = ajax.end(d, o); tools.work(0);
						
						if (d["info"]["success"]) {
							
							if(d["info"]?.["text"]) {
								
								vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
								
							}
							if (close != undefined && close) {
								
								o.closest(".toolbar").querySelector("[data-action='row-close']").click();
								
							}
							
						} else {
							
							vNotify.error({text: d["info"]["text"],visibleDuration:10000});
							
						}

					}
					
				);
			}

		}

	}
	
	rowClose(args, o) {
		
		o.querySelector("button[data-action=row-close]").click();
		
	}
	
	saveCloseRowAddCopy(btn) {
		
		var formO = btn.closest("form");
		form.go(formO, {"class":"RunTools","method":"formAddReplaceTR"});

	}

	formAddReplacedEdit(args, o, d) {//d -дані з серверу

		//додаємо кнопку з налаштуваннями для редагування і жмемо на неї
		o.closest("tr").setAttribute("data-id", d["ID"]);
		
		var action = {
			h: "row",
			a:{
				name	:	d["table"],
				ID		:	d["ID"],
				action	:	"edit",
				t		:	{
					"someInnerRow"	:	"Row::formEdit"
				},
			}
		};
		
		if (args["a"]?.["config"]) {
			action["a"]["config"] = args["a"]["config"];
		}
		

		var hrefStart = "/p/run/";
		var elem = element.create(
			"button",
			{
				"attr"	:	{
					"type"			:	"button",
					"data-action"	:	"row-edit",
					"data-href"		:	hrefStart+tools.transformObjToStr(action),
					"onclick"		:	"run.go(this)"
				}
			}
		);
		o.closest("tr").append(elem);
		elem.click();//жмемо кнопку оновити, вона не видна
	}
	
	formAddReplaceTR (args, o, d) {//d -дані з серверу

		//додаємо кнопку з налаштуваннями для закриття рядку і жмемо на неї

		o.closest("tr").setAttribute("data-id", d["ID"]);
		
		var action = {
			h: "table",
			a:{
				name	:	d["table"],
				ID		:	d["ID"],
				action	:	"view",
				t		:	{
					"someTr"	:	"Table::trReload"
				},
			}
		};
		var hrefStart = "/p/run/";
		var elem = element.create(
			"button",
			{
				"attr"	:	{
					"type"			:	"button",
					"data-action"	:	"row-close",
					"data-href"		:	hrefStart+tools.transformObjToStr(action),
					"onclick"		:	"run.go(this)"
				}
			}
		);
		o.closest("tr").append(elem);
		elem.click();//жмемо кнопку
	}

	setTextareasPreview(o) {
		
		var textareas = o.closest(".block").querySelectorAll("textarea[name]");
		
		if (textareas) {
			
			o.classList.toggle("active");
			
			for (let i = 0; i < textareas.length; i++) {
				
				if (textareas[i].style.display != "none") {//видима
					
					textareas[i].style.display = "none";//ховаємо
					
					var previewFilter = textareas[i].value;
					previewFilter = previewFilter.replace(/\r\n/mg, "\n");
					previewFilter = previewFilter.replace(/\r/mg, "\n");
					previewFilter = previewFilter.replace(/\n\n/mg, "</p>\n<p>");
					
					var preview = document.createElement("div");
					preview.className = "preview";
					preview.style.height = textareas[i].style.height;
					preview.innerHTML = previewFilter;

					textareas[i].insertAdjacentElement("afterend", preview);
				
				} else {
					
					textareas[i].style.display = null;//показуємо
					textareas[i].nextSibling.remove();//видяляємо .preview
					
				}
			
			}
			
		}
		
	}
	
	toggleTextareaPell(textarea) {

		let state = textarea.classList.contains("displayNone");
		let divLine = textarea.closest(".line");

		if (state) {
			
			textarea.classList.remove("displayNone");
			divLine.classList.add("textareaPellView");
			
		} else {
			
			textarea.classList.add("displayNone");
			divLine.classList.remove("textareaPellView");
		}
	}
	
	transliterateField(o) {
		
		var inElemPrev = o.closest(".line").previousElementSibling;
		var outElem = o.nextElementSibling;

		var inElem = null;

		if (inElemPrev.classList.contains("line")) {
			
			inElem = inElemPrev.querySelector("input");
			
		} else {
			
			inElem = inElemPrev;
		}
		
		if (inElem) {//є елемент
				
			if (inElem.value) {//з непустим значенням

				var args = {
					h	:	"exec",
					a	:	{
						"name"		:	"transliterate",//method
						"work"		:	1,
						"attr"	:	{
							"language"	:	inElem.getAttribute("data-l"),
							"value"		:	inElem.value,
						}
					}
				};
				
				ajax.start(args, o).then(
				
					function(d) {
						d = ajax.end(d, o);
						if(d["info"]["success"]){
							outElem.value = d["data"]["value"];
						} else {
							vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						}
					}
				);
			} else {
				vNotify.error({text: "Input Empty"});
			}
		}
	}
	
	translateField(o, lFrom) {

		var input = o.closest(".block").querySelector("textarea[data-l='" + lFrom + "'], input[data-l='" + lFrom + "']");

		if (input ?? input.value) {//є елемент, значення якого треба перекласти, та значення не пусте

			//шукаємо елемент з признаком мови, на яку треба перекласти
			var tElem = o.closest(".line").querySelector("textarea[data-l], input[data-l]");
			

			var t = tElem.getAttribute("data-l");
			
			var args = {
				h	:	"exec",
				a	:	{
					"name"		:	"translate",//method
					"work"		:	1,
					"attr"	:	{
						"value"		:	input.value,
						"s"			:	lFrom,
						"t"			:	t,
					}
				}
			};

			tools.work(1, o);
			ajax.start(args, o).then(
			
				function(d) {
					
					d = ajax.end(d, o); tools.work(0, o);
					
					if (d["info"]["success"]) {
						
						tElem.value = d["data"]["text"];
						var divPell = tElem.closest(".line").querySelector(".pell");
						if (divPell) {//переносимо в pell
							
							divPell.querySelector(".pell-content").innerHTML = d["data"]["text"];
							
						}
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
			);
			
		} else {
			
			vNotify.error({text: "Input Empty"});
		}
	}
	
	uploadToolbar(config, block) {

		while (block.firstChild) {//видаляємо всі дочірні елементи
			block.removeChild(block.firstChild);
		}
		
		let ID = parseInt(config["ID"]);
		let tableName = config["table"];
		let type = config["type"];
		let info = config?.["info"] ? config["info"] : type;
		let before = config?.["before"] ? config["before"] : "";
		let after = config?.["after"] ? config["after"] : "";

		if (!isNaN(ID)) {//тільки при редагуванні батьківського документу
			
			var args = {
				h	:	"exec",
				a	:	{
					name	:	"getUploadToolbar",
					table	:	tableName,
					parent	:	ID,
					type	:	type,
					work	:	1,
				}
			};
					
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);
					
					if (d["info"]["success"]) {
						
						/*вже є, як мінімум, права на перегляд*/
						
						var uploadForm = element.create("div", {
							"class"	:	"uploadForm",
							"attr"	:	{
								"data-type"	:	"form"
							}
						});

						block.append(uploadForm);
						
						var line = element.create("div", {
							"class"	:	"line"
						});
						block.append(line);
						
						var toolbarLeft = element.create("div", {
							"class"	:	"toolbar"
						});
						
						var reloadButton = element.create("button", {
							
							"class"	:	["la", "la-24", "la-refresh", "h-40"],
							"attr"	:	{
								"type":			"button",
								"title":		library.get("Reload") + " " + library.get(type) + " " +library.get("Toolbar"),
								"data-action":	type + "-toolbar-reload",
							}
							
						});
						
						var callbackF = function(p1, p2) {
							
							return function() {
								
								runTools.uploadToolbar(p1, p2);
								
							};
							
						};
						
						reloadButton.addEventListener("click", callbackF(config, block));
			
						toolbarLeft.append(reloadButton);

						if (d["permission"][1]) {//insert

							var addButton = element.create("button", {
								"class"	:	["la", "la-24", "la-plus", "h-40"],
								"attr"	:	{"type": "button", "title":library.get(tools.capitalize(type))+" "+library.get("Add")}
							});
							
							callbackF = function(p1, p2, p3) {
								return function() {
									
									runTools.uploadPrepare(p1, p2, p3);
									
								};
							};
							
							addButton.addEventListener("click", callbackF(args, uploadForm, reloadButton));
							
							toolbarLeft.append(addButton);
							
						}

						toolbarLeft.append(element.create("div", {
							"class"	:	["bg-pink", "disabled", "h-40"], 
							"html"	:	info,
							"attr"	:	{
								"data-action"	:	"info",
							}
						}));
						
						var count = 0;
						
						if (d?.["data"]?.length) {
							
							count = d["data"].length;
							
							var needTranslate = false;//флаг потреби в перекладах

							if (d["translate"] != undefined) {//є потреба в перекладах
								
								needTranslate = true;
								
							}

							var itemsList = element.create("div", {
								"class"	:	type + "List"
							});
							
							itemsList.id = type+ "List-"+tableName+"-"+ID;
							
							var itemBlock, itemLeftBlock, href, item, groupBtn, translateData;
							let sizes;
							for (var i = 0; i < d["data"].length; i++) {//обходимо дані
								
								itemBlock = element.create("div", {
									"class"	:	"item",
									"attr"	:	{
										"data-id"	:	d["data"][i]["ID"]
									}
								});
							
								itemLeftBlock = element.create("div", {
									"class"	:	"item-left"
								});
							
								href = d["data"][i]["urlStart"]+"/"+d["data"][i]["name"];
								
								var stSelect = null;
								
								switch (type) {
									
									case "image":
										href += "?"+Date.now();
										item = element.create("a", {
											"attr" : {
												"href"			:	href,
												"data-name"		:	d["data"][i]["name"],
												"data-ID"		:	d["data"][i]["ID"],
											}
										});
										
										sizes = document.createElement("div");
										sizes.classList.add("small");
										sizes.setAttribute("title", "Розміри оригіналу");
										sizes.append(d["data"][i]["width"]+"x"+d["data"][i]["height"]);
										item.append(sizes);
										
										if (d["data"][i]?.["thumb"]) {
											
											item.setAttribute("style", "background-image:url('"+d["data"][i]["urlStart"]+"/"+d["data"][i]["thumb"]["name"].replace(/'/i, "\\'")+"?"+Date.now()+"')");
											
										}
										
										if (d?.["st"]) {//встановлено, для яких розмірів треба виводити select
											
											var stSelect = element.create("select", {
												"class"	:	"st"
											});

											for (var stI = 0; stI < d["st"].length; stI++) {
												
												stSelect.append(element.create("option", {
													"html"	:	d["st"][stI],
													"attr"	:	{
														"value"	:	d["st"][stI]
													}
												}));
											}
											
											//console.log(d["st"]);
											
										}
									
									
									break;
									
									case "file":
									
										item = element.create("a", {
											"attr" : {
												//"style"		:	"",
												"href"		:	href,
												"target"	:	"_blank",
												"data-ID"	:	d["data"][i]["ID"],
											},
											"html"	:	d["data"][i]["name"]+" ("+d["data"][i]["fileSize"]+" b)",
										});

									break;
									
									case "filePrivate":
									
										item = element.create("div", {
											"attr" : {
												"data-ID"	:	d["data"][i]["ID"],
											},
											"html"	:	d["data"][i]["name"]+" ("+d["data"][i]["fileSize"]+" b)",
										});
										
									break;
									
								}
								
								itemLeftBlock.append(item);
								
								if (stSelect !== null) {
									
									itemLeftBlock.append(stSelect);
									
								}
								
								if (d?.["permission"]) {
									
									groupBtn = element.create("div", {
										"class"	:	"toolbar"
									});
									
									if (d["permission"][3]) {//видалення
										
										var deleteBtn = element.create("button", {
											"class"	:	["la", "la-24", "h-30", "la-minus"],
											"attr"	:	{
												"type"	:	"button",
												"title"	:	library.get(type) + " "+library.get("Delete")
											}
										});
										
										callbackF = function(ID) {
											
											return function() {
												
												var deleted = confirm(library.get("You want to delete ") + library.get(type)+ " ID: "+ID+". "+library.get("Are you sure?"));
												
												if (deleted) {
													
													var args = {
														"h"	:	"table",
														"a"	:	{
															"name"		:	type,
															"action"	:	"delete",
														},
														"IDs"		:	[ID],
													};
													
													ajax.start(args).then(
													
														function(d) {
															
															d = ajax.end(d);
															
															if (d["info"]["success"]) {
																
																runTools.uploadToolbar(config, block);
																
																vNotify.info({text: library.get(type) + " " +  library.get("Deleted"),visibleDuration:1000,showClose:false});
																
																
															} else {
																vNotify.error({text: d["info"]["text"],visibleDuration:10000});
															}
														}
													);
												}

											};
										};
										
										deleteBtn.addEventListener("click", callbackF(d["data"][i]["ID"]));
										groupBtn.append(deleteBtn);
									}

									var copyIDBtn = element.create("button", {
										"class"	:	["la", "la-24", "h-30", "la-copy"],
										"attr"	:	{
											"type"	:	"button",
											"title"	:	"ID: "+d["data"][i]["ID"]+", "+library.get("Copy")+" "+library.get("Macro")  + " "+library.get(type)
										}
									});
									
									callbackF = function(p1, p2, type) {
										
										return function() {
											
											var textToClipboard = "["+type+" ID='"+p1+"'";
											
											var st = p2.querySelector("select.st");
											if (st && st.value != "0") {
												textToClipboard += " st='"+st.value+"'";
											}
											textToClipboard += "/]";
											tools.toClipboard(textToClipboard);
											
										};
										
									};
									copyIDBtn.addEventListener("click", callbackF(d["data"][i]["ID"], itemBlock, type));

									groupBtn.append(copyIDBtn);
									
									itemLeftBlock.append(groupBtn);
								}
								

								
								itemBlock.append(itemLeftBlock);

								if (needTranslate && d["permission"][1] && d["permission"][2]) {
									/*вставка та редагування*/
									
									var translateBtn = element.create("button", {
										"class"	:	["las", "la-24", "h-30", "la-language"],
										"attr"	:	{
											"type"	:	"button",
											"title"	:	library.get(""+type+"") + " " + library.get("Translate"),
											"onclick"	:	"runTools.toggleUploadToolbarTranslate(this)"
										}
									});
									
									translateData = null;
									
									if (d["translate"]["data"] != undefined && d["translate"]["data"][d["data"][i]["ID"]] != undefined) {//виводимо кількість перекладів в кнопку
										
										//translateBtn.innerText = d["translate"]["count"][d["data"][i]["ID"]];
										
										translateData = d["translate"]["data"][d["data"][i]["ID"]];
									}
									
									groupBtn.append(translateBtn);
									
									itemBlock.append(createTranslateForm(
										d["data"][i]["ID"],
										d["translate"],
										translateData,
										tableName
									));
									
								}
								
								itemsList.append(itemBlock);
								
							}
							
							block.append(itemsList);
							
							if (type == "image") {

								baguetteBox.run("#"+type + "List-" + tableName + "-" + ID, {
									
									captions: function(element) {

										var caption = "";
										var ID =  element.getAttribute("data-ID");
										var href =  element.getAttribute("href");

										caption += "<div class='line'>";
										
										caption += element.getAttribute("data-name") + ", ID: " + ID;
										
										caption += "<div class='toolbar'>";
										
										caption += "<button type='button' onclick='runTools.imageRotateModal(" + ID+ ", this)' data-src='" + href + "' data-table='"+tableName+"'>"+library.get("Rotate Image")+"</button>";
										caption += "<button type='button' onclick='runTools.imageCropModal(" + ID+ ", this)' data-src='" + href + "' data-table='"+tableName+"'>"+library.get("Crop Image")+"</button>";
										
										caption += "</div>";//.toolbar
										caption += "</div>";//.line
										return caption;
									
									}
								
								});
							
							}

						}
						
						toolbarLeft.append(element.create("div",{
							"class"	:	"count",
							"html"	:	count
						}));
						
						if (before) {
							toolbarLeft.prepend(element.create("div",{
								"html"	:	before
							}));
						}
						
						if (after) {
							toolbarLeft.append(element.create("div",{
								"html"	:	after
							}));
						}
						
						line.prepend(toolbarLeft);

						if (count) {
							
							if (d["permission"][2]) {
								//update
								
								/*редагування*/
								var toolbarRight = element.create("div", {"class":"toolbar"});
								line.append(toolbarRight);
								
								var sortableButton = element.create("button", {
									"class"	:	["la", "la-24", "la-sort", "h-40"],
									"attr"	:	{
										"type"			:	"button",
										"title"			:	library.get(type) + " " + library.get("Sorted"),
										"data-state"	:	0
									}
								});
								
								callbackF = function(p1, p2) {
									return function() {
										sortable.make(p1, p2);
									};
								};
								sortableButton.addEventListener("click", callbackF(itemsList, sortableButton));

								var serializeButton = element.create("button", {
									"class"	:	["la", "la-24", "la-save", "h-40", "primary", "displayNone"],
									"attr"	:	{"type": "button", "title": library.get("Save Sorted")}
								});
								
								callbackF = function(p1, p2) {
									
									return function() {
										var data = sortable.serialize(p1, p2);
										
										if(data) {
											sortable.deMake(p1, p2);
											
											var args = {
												"h"	:	"exec",
												"a"	:	{
													"name"	:	"tableSortableSerialize",
													"work"	:	1,
													"table"	:	type,
													"IDs"	:	data,
												}
											};
											
											ajax.start(args).then(
											
												function(d) {
													
													d = ajax.end(d);
													if (d["info"]["success"]) {
														
														if (d["info"]["text"] != undefined) {
															
															vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
															
														}
														
													} else {
														
														vNotify.error({text: d["info"]["text"],visibleDuration:10000});
														
													}
												}
											);
										}
									};
								};
								serializeButton.addEventListener("click", callbackF(itemsList, sortableButton));
								
								toolbarRight.prepend(serializeButton);
								toolbarRight.prepend(sortableButton);

							}
							

						}

					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);
			
			//block.style.width = "100%";
			block.classList.remove("displayNone");
			
		}
		

		return block;

		/*методи*/
		
		function saveTranslate(data, type) {
			
//			console.log(data, type);return false;
			
			var args = {
				h	:	"exec",
				a	:	{
					work	:	1,
					name	:	"saveUploadTranslate",
					table	:	type,
				},
				data	:	data,
			};
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);
					if (d["info"]["success"]) {//успішно
						
						vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
					
				}
			);
		}
		
		function createTranslateForm (ID, translateSetting, translateImageData, tableName) {
			
			var block, header, input, action;

			var translateForm = element.create("div", {
				"attr"	:	{
					"data-type"	:	"form",
					"data-id"	:	ID
				},
				"class"	:	"item-right"
			});
			
			var blockWr = element.create("div", {"class"	:	"blockWr"});
			
			blockWr.append(
				element.create("input", {
					"attr"	:	{
						"type"		:	"hidden",
						"data-name"	:	"parent",
						"value"		:	ID,
					}
				})
			);
			
			blockWr.append(
				element.create("input", {
					"attr"	:	{
						"type"		:	"hidden",
						"data-name"	:	"table",
						"value"		:	tableName,
					}
				})
			);
				

			var autoSet = translateSetting["autoSet"];
			var languages = translateSetting["languages"];
			var lOrder = translateSetting["lOrder"];
			var languageMain = translateSetting["languageMain"];
			var autoTranslate = translateSetting["autoTranslate"];
			var line;
			var tAction;
			var toolbar;

			translateForm.append(blockWr);
			
			for (var i in autoSet["fields"]) {

				block = element.create("div", {"class"	:	"block"});
				header = element.create("div", {"class"	:	"header", "html": i});
				block.append(header);
				
				for (var j = 0; j < lOrder.length; j++) {
					
					line = element.create("div", {"class"	:	"line"});

					input = element.create("input", {
						"attr"	:	{
							"type":			"text",
							"data-name":	"fakeField-translate-" + autoSet["fields"][i] + "-" + lOrder[j],
							"data-l":		lOrder[j],
						}
					});

					input.addEventListener("keypress", function() {
						
						if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
							event.preventDefault();
							saveTranslate(form.returnData(event.target.closest("[data-type='form']")), type);
						}
						
					});

					if(translateImageData !== null && translateImageData[lOrder[j]] != undefined && translateImageData[lOrder[j]][autoSet["fields"][i]] != undefined) {
						
						input.value = translateImageData[lOrder[j]][autoSet["fields"][i]]["value"];
						
					}
					
					if (autoTranslate) {
						
						toolbar = element.create("div", {"class"	:	"toolbar"});

						line.append(input);
						
						for (let ii in languages) {
							
							if (ii != lOrder[j]) {
								
								tAction = element.create("button", {
									"attr"	:	{
										"type"		:	"button",
										"title"		:	"translate",
										"onclick"	:	"runTools.translateField(this,"+ii+")",
										"tabindex"	:	-1,
										"title"		:	library.get("Translate From") + " "+ languages[ii]["name"]+" to " + languages[lOrder[j]]["name"],
									},
									"class"	:	[
										"las", "la-16", "h-30", "la-language", "small"
									],
									"html"		:	languages[ii]["name"],
									
								});
								
								toolbar.append(tAction);
								
							}

						}

						line.append(toolbar);
						
						block.append(line);

					} else {
						
						block.append(input);
					
					}
				}

				blockWr.append(block);
				;
			}
			
			translateForm.append(blockWr)

			var submit = element.create("button", {
				"attr"	:	{
					"type"	:	"button"
				},
				"html"	:	library.get("Save")
			});
			
			submit.addEventListener("click", function(e) {//клік по кнопці
				
				saveTranslate(form.returnData(e.target.closest("[data-type='form']")), type);
				
			});
			translateForm.append(submit);
			
			return translateForm;
		}
		
		function viewTranslate (block, ID, translateList, itemsList) {
			
			tools.work();
			
			var view = translateList.querySelector(".view");
			
			if (view){//є видимий блок - ховаємо
				
				view.classList.remove("view");
				
			}
			
			var itemsView = itemsList.querySelectorAll(".item.view");
			
			for (var i = 0; i < itemsView.length; i++) {
				itemsView[0].classList.remove("view");
			}
			
			if (!view || view.getAttribute("data-id") != ID) {
				
				translateList.querySelector("[data-id='"+ID+"']").classList.add("view");
				block.classList.add("view");
				
			}
			
			setTimeout (function() {
				tools.work(0);
			}, 100);
		}
	
	}
	
	uploadPrepare(args, uploadForm, reloadButton) {
		
		/*Підготовка форми для завантаження*/
		
		while (uploadForm.firstChild) {//видаляємо всі дочірні елементи
			
			uploadForm.removeChild(uploadForm.firstChild);
			
		}

		if (args["a"]?.["table"] && args["a"]?.["parent"] && args["a"]?.["type"]) {
			
			uploadForm.append(element.create("input", {
				attr : {
					type : "hidden",
					name : "table",
				},
				value : args["a"]["table"]
			}));
			
			uploadForm.append(element.create("input", {
				attr : {
					type : "hidden",
					name : "parent",
				},
				value : args["a"]["parent"]
			}));
			
			uploadForm.append(element.create("input", {
				attr : {
					type : "hidden",
					name : "type",
				},
				value : args["a"]["type"]
			}));
			
			/*зганяємо на сервер за налаштуваннями*/
			
			var argsExec = {
				h	:	"exec",
				a	:	{
					"name"	:	"getFromData",
					"path"	:	["setting", "upload", args["a"]["type"]],
					"work"	:	1,
				}
			};
			
			ajax.start(argsExec).then(
			
				function(d) {
					
					d = ajax.end(d);
					
					if (d["info"]["success"] && d?.["data"]?.["path"]) {
						
						var path = d["data"]["path"];
						var cols = element.create("div", {class : "cols"});
						
						if (path.length > 1) {//додаємо колонки, при необхідності
							
							cols.classList.add("col"+path.length);
							
						}
						
						for (var i = 0; i < path.length; i++) {
							
							switch (path[i]) {
								
								case "files":
								
									var divFilesCol = element.create("div", {class : "filesCol"});
									
									var input = element.create("input", {
										attr	:	{
											type		:	"file",
											name		:	"files",
										},
										multiple	:	true
									});
									
									input.setAttribute("accept", "." + Object.keys(d["data"]["accept"]).join(",."));
									
									input.addEventListener("input", function () {
										runTools.getUploadInfo(uploadForm, reloadButton);
									});

									var divFileInfo = element.create("div", {class : "info"});
									
									divFilesCol.append(input);
									divFilesCol.append(divFileInfo);

									cols.append(divFilesCol);
									
								break;
								
								case "urls":
								
									var divUrlsCol = element.create("div", {class : "urlsCol"});
									
									var textarea = element.create("textarea");
									
									/*if (args["a"]["type"] == "image") {
										textarea.value = "https://cdn.pixabay.com/photo/2022/08/28/09/40/wild-7416210_960_720.jpg\n";
									}*/

									textarea.addEventListener("input", function (){runTools.getUploadInfo(uploadForm, reloadButton);});
									var divUrlInfo = element.create("div", {class : "info"});
									
									divUrlsCol.append(textarea);
									divUrlsCol.append(divUrlInfo);
									

									cols.append(divUrlsCol);
										
								break;
								
							}
							

						}

						var button = element.create("button", {
							attr	:	{
								"title"		:	"Upload "+ library.get(args["a"]["type"]),
								"data-type"	:	"submit",
								"type"		:	"button"
							},
							class	:	["la", "la-24", "h-40", "la-upload", "primary", "displayNone"],
							html	:	library.get("Upload") + "<span class='count'>0</span>"
						});

						button.addEventListener("click", function (e){e.preventDefault();runTools.uploads(uploadForm, reloadButton);});
						
						var close = element.create("button", {
							attr	:	{
								type	:	"button",
								title	:	library.get("Close"),
							},
							class	:	["la", "la-16", "h-24", "la-close"]
						});
						
						close.addEventListener("click", function (e) {
							
							var uploadFormForClear = e.target.closest(".uploadForm");
							
							while (uploadFormForClear.firstChild) {//видаляємо всі дочірні елементи
								uploadFormForClear.removeChild(uploadFormForClear.firstChild);
							}
						});
						
						uploadForm.append(cols);
						uploadForm.append(button);
						uploadForm.append(close);
						
						runTools.getUploadInfo(uploadForm, reloadButton);

					}
				}
				
			);

		}

	}
	
	getUploadInfo (uploadForm, reloadButton) {
		
		var submit = uploadForm.querySelector("button[data-type=submit]");
		var j = 0;//загальна кількість файлів для завантаження, показуємо в submit
		
		var messageFiles = "";
		var fileInput = uploadForm.querySelector("input[type=file]");

		var files = null;//файли для завантаження з комп'ютера
		var urls = null;
		
		if (fileInput) {
			
			files = [];//файли для завантаження з комп'ютера
			var divFilesInfo = uploadForm.querySelector(".filesCol .info");
			
			var file;
			for (var i = 0; i < fileInput.files.length; i++) {
				
				file = fileInput.files[i];

				files.push(file.name);
				++j;

				messageFiles += "<li data-index='" + i + "'>" + j + ". " + file.name + ", " + (file.size/1024).toFixed(0) + " Кб <span></span></li>";
				
			}

			if (files.length == 0) {
				files = null;
			}
		}

		var messageUrls = "";
		var urlInput = uploadForm.querySelector("textarea");
		
		if (urlInput) {
			
			var divUrlsInfo = uploadForm.querySelector(".urlsCol .info");

			urls = urlInput.value.split("\n");
			var tmp;
			var fileName;
			
			for (var i = 0; i < urls.length; i++) {
				
				if (urls[i] != "") {

					tmp = urls[i].split("/");
					fileName = tmp[tmp.length-1];
					++j;
					messageUrls += "<li>" + j + ". " + fileName + "</li>";
					
				}
				
			}
			
			if (urls.length == 1 && urls[0] == "") {
				urls = null;
			}

		}

		submit.querySelector(".count").innerHTML = j;
		
		if (j) {
			
			submit.classList.remove("displayNone");
			
		} else {
			
			submit.classList.add("displayNone");
			
		}
		
		if (messageFiles) {
			
			divFilesInfo.innerHTML = "<ul>" + messageFiles + "</ul>";
		
		}
		
		if (messageUrls) {
			
			divUrlsInfo.innerHTML = "<ul>" + messageUrls + "</ul>";
			
		} else {//очищуємо info-block
			
			if (divUrlsInfo) {
				divUrlsInfo.innerHTML = "";
			}
			
		
		}

		if (files !== null && urls === null) {//в випадку, якщо тільки файли з диску, зразу submit
			runTools.uploads(uploadForm, reloadButton);
		}

	}
	
	uploads(form, reloadButton) {

		var uploadsFilesElem = form.querySelector("input[type=file]");
		
		var setting = {
			table	:	form.querySelector("input[name=table]").value,
			parent	:	form.querySelector("input[name=parent]").value,
			type	:	form.querySelector("input[name=type]").value,
		};
		
		var uploadsUrlsElem = form.querySelector("textarea");
		
		var uploadsFilesData = uploadsFilesElem.files;
		var uploadsFilesCount = uploadsFilesData.length;
		
		var uploadsUrlsCount = 0;
		var uploadsUrlsData = null;
		
		if (uploadsUrlsElem) {
			
			var uploadsUrlsData = uploadsUrlsElem.value.split("\n");
			for (var i = 0; i < uploadsUrlsData.length; i++) {
				
				if (uploadsUrlsData[i]) {
					
					++uploadsUrlsCount;
					
				} else {
					
					uploadsUrlsData.splice(i);
					
				}
			}
		}
		
		var uploadsCount = uploadsFilesCount + uploadsUrlsCount;//загальна кількість файлів для завантаження

		if (uploadsCount > 0) {
			
			vNotify.info({text: "Upload " + uploadsCount + " files In Progress",visibleDuration:5000});
			
			tools.work(1);
			
			if (uploadsFilesCount) {
				
				runTools.uploadsFiles(uploadsFilesData, form, setting, uploadsCount, reloadButton);
				
			}
			if (uploadsUrlsCount) {
				
				runTools.uploadsUrls(uploadsUrlsData, form, setting, uploadsCount, reloadButton);
				
			}

		} else {
			vNotify.info({text: "No files to Upload",visibleDuration:1000,showClose:false});
		}
		
		return false;
	}
	
	uploadsFiles(data, form, setting, q, reloadButton) {
		
		if (data) {

			var formData;
			var xhr;

			for (var index in data) {
				
				if (!isNaN(index)) {
					
					xhr = new XMLHttpRequest();
					
					xhr.onreadystatechange = function() {
						
						if (this.readyState == 4 && this.status == 200) {//успішно
							
							q = q - 1;
							runTools.uploadsCountUpdate (q, form, reloadButton);
						
						} else {
						
							vNotify.error({error: this.responseText});
						
						}
					};
					
					(function(index, form) {
						xhr.upload.onprogress = function(event) {
							form.querySelector(".filesCol .info li[data-index='"+index+"'] span").innerHTML = ((event.loaded / event.total) *100).toFixed(0) + " %";
						};
					}(index, form));
					
					xhr.upload.onload = function () {//Файл завантажено на сервер
						
						vNotify.success({text: "Upload File Ok",visibleDuration:500,showClose:false});
						
					};
					
					/*#####################################*/
					
					formData = new FormData();
					formData.append("file", data[index]);
					
					formData.append("h","exec");
					formData.append("a[name]","uploadFile");//метод
					
					formData.append("a[type]", setting["type"]);//image або file
					formData.append("a[table]", setting["table"]);
					formData.append("a[parent]", setting["parent"]);
					
					xhr.open("POST", "/p/ajax", true);
					xhr.send(formData);
				}
			}
		}
	}
	
	uploadsUrls(data, form, setting, q, reloadButton) {
		
		var args = {
			h	:	"exec",
			a	:	{
				name		:	"uploadUrl",
				work		:	1,
				"setting"	:	setting,
			}
		};
		
		for (var i = 0; i < data.length; i++) {
			
			args["a"]["url"] = data[i];
			
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);
					
					if (d["info"]["success"]) {
						
						vNotify.success({text: d["info"]["text"],visibleDuration:1000,showClose:false});
						q = q - 1;
						runTools.uploadsCountUpdate (q, form, reloadButton);
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
					
				}
			);
		}
	}

	uploadsCountUpdate (q, form, reloadButton) {
		
		var submit = form.querySelector("[data-type='submit']");
		
		if (!submit) {
			
			submit = form.querySelector("button[type='submit']");
		
		}
		
		if (submit) {
			
			submit.querySelector("span.count").innerHTML = q;
		
		}
		
		if (q == 0) {//всі файли завантажено
			
			vNotify.success({text: "All Files Upload Ok"});
			
			tools.work(0);
			
			if (reloadButton != undefined) {
				
				reloadButton.click();
			
			}
			
		}
	}
	
	viewImageInModal (o) {
		
		var modalID = 1;
		
		var titleE = document.getElementById("modal-"+modalID+"-title");
		titleE.innerHTML = library.get("View Image") + "<span>" + o.getAttribute("data-image") + "</span>";

		var contentE = document.getElementById("modal-"+modalID+"-content");
		var html = "";
		//console.log(o.getAttribute("data-image").replace(/'/i, "\'"));
		var image = "<div class='image-wr'><img src=\"" + o.getAttribute("data-image") + "?"+Date.now()+"\" alt></div>";

		html += image;
		
		contentE.innerHTML = html;
		
		MicroModal.show("modal-"+modalID);
		
	}
	
	toTopTab(o) {
		
		if (o.closest(".accordion")) {

			tools.scrollIt(tools.getOffsetRect(o.closest(".tab"))["top"], 200);
		}
	
	}
	
	rulesToJSON(o, direction) {
		
		var textarea = o.closest(".toolbar").querySelector("textarea");
		var rules = o.closest(".block").querySelector("input[name]");
		
		switch (direction) {
			
			case 1:
				textarea.value = JSON.stringify(tools.transformStrToObj(rules.value));
				
			break;
				
			case 2:
			
				if (textarea.value != "") {
					rules.value = tools.transformObjToStr(JSON.parse(textarea.value));
				}

			break;

		}
		
	}
	
	insertHModal(tag) {
	
		var config = tools.transformStrToObj(tag.getAttribute("data-href"));

		var titleE = document.getElementById("modal-"+config["a"]["target"]+"-title");

		titleE.innerHTML = config["header"] ? config["header"] : "";

		var contentE = document.getElementById("modal-"+config["a"]["target"]+"-content");

		runTools.insertH(config, contentE);
		
		MicroModal.show("modal-"+config["a"]["target"]);

	}
	
	insertH(config, readyNode) {/*обгортка для врізки*/
		//console.log(5149, config);
		if (
			config?.["h"]
			&& config?.["a"]
			&& config?.["a"]["section"]
		) {//обов'язкові поля
			//console.log(readyNode);
			var needFlag = true;
			
			if (config?.["a"]?.["filter"]) {//перевіряємо, чи встановлено значення першого фільтра, тобто, чи є ID батьківського елементу
				
				if (!Object.values(config["a"]["filter"])[0]) {
					needFlag = false;
				}
			}

			if (needFlag) {
				
				while (readyNode.firstChild) {//видаляємо всі дочірні елементи
					
					readyNode.removeChild(readyNode.firstChild);
					
				}
				
				var classReady = Factory.create(tools.capitalize(config["h"]));
				
				if (classReady) {
					var section = element.create("section");
					
					var input = element.create("input", {
						"attr"		:	{
							"data-url": config["h"],
						},
						"value"		:	"/p/run/" + tools.transformObjToStr(config),
						"readonly"	:	true
					});
					
					section.append(input);
					readyNode.append(section);
					
					config["section"] = section;
					
					classReady.go(config);
					
				} else {
					
					vNotify.error({text: "JS: " + library.get("Class") +" "+ tools.capitalize(params["h"]) + " " + library.get("Not Found"),visibleDuration:10000});
					
				}
				
			} else {//врізаємо заглушку
				
				readyNode.append(element.create("div", {"html":"-"}));
			
			}

		}
		
		return readyNode;
	}
	
	imageRotateModal(ID, o) {
		
		var titleE = document.getElementById("modal-1-title");
		var contentE = document.getElementById("modal-1-content");
		var html = "", image, toolbar = "", input = "";
		
		titleE.innerHTML = library.get("Rotate Image") + " " + ID;
		
		var list = [
			0,
			90,
			180,
			270
		];
		
		for (var i = 0; i < list.length; i++) {
		
			toolbar += "<button style='height:40px' type='button' onclick='runTools.imageRotateSetDegree(this, " + list[i]+ ")'>" + list[i] +  "°</button>";
		
		}
		
		input += "<input type='number' min='0' max='359' value='0' name='degree' onchange='runTools.imageRotateSetDegree(this)' style='width:80px'>";
		
		toolbar = "<div class='toolbar' style='margin-bottom:20px'>" + toolbar + input + "<button class='primary'>" + library.get("Start") + "</button></div>";
		
		image = "<div class='image-wr rotate'><img src='" + o.getAttribute("data-src") + "' alt></div>";
		
		var action = {
			h: "exec",
			a:{
				"name":		"imageRotate",
				"ID":		ID,
				"table":	o.getAttribute("data-table"),
			}
		};
		
		html += "<form method='post' action='" + tools.transformObjToStr(action) + "' onsubmit='form.go(this);return false;'>";

		html += toolbar;
		html += image;
		html += "</form>";
		
		contentE.innerHTML = html;
		
		MicroModal.show("modal-1");
		
	}
	
	imageRotateSetDegree(o, degree) {
		
		var input = o.closest("form").querySelector("input[name='degree']");
		
		if (degree != undefined) {//посилання
			
			input.value = degree;
			
		} else {//input
			
			degree = o.value;
			
		}
		
		runTools.imageRotateAction(o);

	}
	
	imageRotateAction(o) {
		
		var degree = o.closest("form").querySelector("input[name='degree']").value;
		var img = o.closest("form").querySelector("img");
		
		if (degree && img) {
			
			img.style.transform = "rotate("+degree+"deg)";
			
		}
	}
	
	imageCropModal(ID, o) {

		var titleE = document.getElementById("modal-1-title");
		var contentE = document.getElementById("modal-1-content");
		var html = "", image, toolbar = "", inputs = "", buttonClass;

		titleE.innerHTML = library.get("Crop Image") + " " + ID;
		
		var list = [
			"free",
			"16:9",
			"4:3",
			"1:1"
		];
		
		for (var i = 0; i < list.length; i++) {
			buttonClass = "";
			
			if (i == 0) {
				
				buttonClass = " class='active'";
			
			}
			
			toolbar += "<button" + buttonClass + " type='button' onclick='runTools.imageCropSetAspectRatio(this)' data-value='" + list[i] + "'>" + list[i] +  "</button>";
		
		}
		
		toolbar = "<div class='toolbar' style='margin-bottom:10px'>" + toolbar + "<button class='primary'>" + library.get("Start") + "</button></div>";

		image = "<div id='mount'></div>";
		
		inputs += "<div class='cols col4 crop' style='margin-bottom:20px'>";
		
		inputs += "<div>";
			inputs += "X<input type='number' id='input-x' name='x' value='0' min='0' readonly>"; 
		inputs += "</div>";
		
		inputs += "<div>";
			inputs += "Y<input type='number' id='input-y' name='y' value='0' min='0' readonly>"; 
		inputs += "</div>";
		
		inputs += "<div>";
			inputs += library.get("Width") + "<input type='number' name='width' id='input-width' value='0' min='0' readonly>"; 
		inputs += "</div>";
		
		inputs += "<div>";
			inputs += library.get("Height") + "<input type='number' name='height' id='input-height' value='0' min='0' readonly>"; 
		inputs += "</div>";

		
		inputs += "</div>"; 
		
		var action = {
			h: "exec",
			a:{
				"name":	"imageCrop",
				"ID":	ID,
				"table":	o.getAttribute("data-table"),
			}
		};
		
		html += "<form method='post' action='" + tools.transformObjToStr(action) + "' onsubmit='form.go(this);return false;'>";

		//html += "<input type='hidden' name='ID' value='" + ID + "'>";
		html += toolbar;
		html += inputs;
		html += image;
		html += "</form>";
		
		contentE.innerHTML = html;
		
		var crop = tinycrop.create({
			
			parent: "#mount",
			image: o.getAttribute("data-src"),
			bounds: {
				width:	"100%",
				height:	"100%",
			},
			selection: {
				color: 'red',
				activeColor: 'blue',
				//aspectRatio: 1 / 1,
				// minWidth: 200,
				// minHeight: 300
				// width: 400,
				// height: 500,
				// x: 100,
				// y: 500
			}
			
		})
		
		crop
			.on("start", function (region) { runTools.imageCropSetInputsFromRegion(region); })
			.on("move", function (region) { runTools.imageCropSetInputsFromRegion(region); })
			.on("resize", function (region) { runTools.imageCropSetInputsFromRegion(region); })
			.on("change", function (region) { runTools.imageCropSetInputsFromRegion(region); })
			.on("end", function (region) { runTools.imageCropSetInputsFromRegion(region); })
		;
		
		runTools.crop = crop;
		
		MicroModal.show("modal-1");
		
	}
	
	imageCropSetAspectRatio(o) {
		
		//Встановлюємо параметри обраної зони зображення
		var value = o.getAttribute("data-value");
		var buttons = o.closest(".toolbar").querySelectorAll("button[type='button']");
		
		for (var i = 0; i < buttons.length; i++) {
			
			buttons[i].classList.remove("active");

		}
		
		o.classList.add("active");

		switch (value) {
			
			case "16:9":
				runTools.crop.setAspectRatio(16 / 9);
			break;
			
			case "4:3":
				runTools.crop.setAspectRatio(4 / 3);
			break;
			
			case "1:1":
				runTools.crop.setAspectRatio(1);
			break;
			
			case "free":
				runTools.crop.setAspectRatio(null);
			break;
		}
		
		//console.log(o, value);
	
	}
	
	imageCropSetInputsFromRegion(region) {

		//Встановлюємо в inputs значення обраної зони зображення
		document.getElementById("input-x").value = region._x;
		document.getElementById("input-y").value = region._y;
		document.getElementById("input-width").value = region._width;
		document.getElementById("input-height").value = region._height;

	}

	imagesToolbarReload() {

		var imagesToolbarsReloadBtns = document.querySelectorAll(".imagesToolbar [data-action='images-toolbar-reload']");
		
		if (imagesToolbarsReloadBtns) {
			
			for (let i = 0; i < imagesToolbarsReloadBtns.length; i++) {
			
				imagesToolbarsReloadBtns[i].click();
			
			}
			
			MicroModal.close("modal-1");
			MicroModal.close("modal-2");
			
			baguetteBox.destroy();
			
		}
	}
	
	separateLatLong(latO) {
		
		var latLong = latO.value;
		var longO = latO.closest("form").querySelector("[name='long']");
		
		if (latLong && longO) {
			
			var tmp = latLong.trim().split(" ");

			if (tmp[0] != undefined && tmp[1] != undefined) {
				
				longO.value = tmp[1].trim();
				latO.value = tmp[0].trim();
			} 

		}
	}
	
	changeAllMultipleSelect(o, direction) {
		
		var $select = o.closest(".block").querySelector("select");
		var $options = $select.querySelectorAll("option");
		
		if ($select && $options && $options?.length  > 1) {
			
			for(var i = 0; i < $options.length; i++) {
				
				if ($options[i].value) {
					
					$options[i].selected = direction;
					
				}
			
			}
			
			if ($select.getAttribute("data-ssid")) {//це slim-select
				
				/*if ($select.id) {//встановлено id
					
					var select = new SlimSelect({
						select			:	$select,
						closeOnSelect	:	false,
					});
					
					select.destroy();
				}*/
				
				vNotify.info({text: "Зміни видимі тільки для звичайного select-а, насправді дія успішна. Збережіть і оновіть, — побачите",visibleDuration:10000});
				
			}
			
		}

	}
	
	toggleDisplayNoneNextBlock(o, checkValue) {
		
		var $state;

		switch (checkValue) {
			
			case "checked":
				$state = o.checked;
				checkValue = true;
				
			break;
			
			default:
				$state = o.value;

		}
		
		if ($state  == checkValue) {
			
			o.closest(".block").nextSibling.classList.remove("displayNone");
			
		} else {
			
			o.closest(".block").nextSibling.classList.add("displayNone");
		}
		
	}
	
	editorEDInit(input) {
	
		let toolbar = edToolbar.start(
			[
				'rowToolbarTags',
				'rowToolbarEngine',
				'rowToolbarCurrent',
			]
		);
		
		if (toolbar) {
			
			input.insertAdjacentElement("beforebegin", toolbar);
			
		}

	}
	
	editorPellStart(textarea, divPell) {
		
		textarea.classList.add("displayNone");//ховаємо textarea
		let dataL = textarea.getAttribute("data-l");
		
		if (dataL) {
			divPell.closest(".line").setAttribute("data-l", dataL);
		}

	}
	
	editorPellInit(textarea, thisTranslated) {
		
		var divPell = element.create("div", {
			"class"	:	"pell"
		});
		
		var callbackF = function() {

			return function() {
				
				if (event.target.value) {//якщо не пусте
					
					divPell.querySelector(".pell-content").innerHTML = event.target.value;
					
				}
				
			};
		};

		textarea.addEventListener("input", callbackF());//при зміни в textarea змінюємо pell
		
		textarea.insertAdjacentElement("beforebegin", divPell);
		
		var contentStyle = "";
		
		if (textarea.getAttribute("style")) {
			
			contentStyle = textarea.getAttribute("style");
		
		}

		runTools.editorPellStart(textarea, divPell);
		
		// Initialize pell on an HTMLElement
		pell.init({

			element: divPell,//required
			contentHTML: textarea.value,//required
			contentStyle: contentStyle,
			classes : {//optional

				actionbar: "pell-actionbar",
				button: "pell-button",
				content: "pell-content",
				selected: "pell-button-selected",

			},
			
			onChange: html => {
				
				textarea.value = html;

			},

			actions: [//required
				{
					name: "custom",
					icon: "C",
					title: "Code",
					result: () => runTools.toggleTextareaPell(textarea)
				},
				"paragraph",
				"bold",
				"italic",
				"h2",
				"h3",
				"ulist",
				"olist",
				"link",
			],

		});
	
	}
	
	setInputNotReadonly(o) {
		
		if (o.readOnly) {
			o.readOnly = false;
		} else {
			o.readOnly = true;
		}

	}
	
	runDashBoard() {
		
		//console.log("runDashBoard");
		
	}

	propertyToolbar(config, block) {

		/*Управління властивостями*/
		
		while (block.firstChild) {//видаляємо всі дочірні елементи

			block.removeChild(block.firstChild);
			
		}

		let ID = parseInt(config["ID"]);
		let tableName = config["table"];

		if (!isNaN(ID)) {//при редагуванні

			var args = {
				h	:	"exec",
				a	:	{
					"name"	:	"propertyToolbar",
					"work"	:	1,
				},
				p	:	config,
			};

			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);
					
					if (d["info"]["success"]) {

						/*вже є, як мінімум, права на перегляд*/
						
						var line = element.create("div", {
							"class"	:	"line"
						});
						
						var toolbarLeft = element.create("div", {
							"class"	:	"toolbar"
						});
						
						var reloadButton = element.create("button", {
							
							"class"	:	["la", "la-24", "la-refresh", "h-40"],
							"attr"	:	{
								"type":			"button",
								"title":		library.get("Reload") + " " + library.get("Property"),
								"data-action":	"property-toolbar-reload",
							}
							
						});
						
						var callbackF = function(p1, p2) {
							
							return function() {
								
								runTools.propertyToolbar(p1, p2);
								
							};
							
						};
						
						reloadButton.addEventListener("click", callbackF(config, block));
						toolbarLeft.append(reloadButton);

						var groupsForm = element.create("div", {
							"class"	:	"groups",
							"attr"	:	{
								"data-type"	:	"form"
							}
						});
						
						groupsForm.append(line);
						
						groupsForm.append(element.create("input", {"attr":{"type":"hidden","data-name":"table"},"value":tableName}));
						groupsForm.append(element.create("input", {"attr":{"type":"hidden","data-name":"parent"},"value":ID}));

						if (d?.["permission"] && d["permission"] == "1111") {//повинні бути права на все
							
							var saveButton = element.create("button", {
								
								"class"	:	["la", "la-24", "la-save", "h-40"],
								"attr"	:	{
									"type":			"button",
									"title":		library.get("Save") + " " + library.get("Options"),
									"data-action":	"property-toolbar-save",
									"onclick"	:	"runTools.savePropertyToolbarDataBtn(this)"
								}
								
							});
							
							toolbarLeft.append(saveButton);
							
						}
						
						toolbarLeft.append(element.create("div", {
							"class"	:	["bg-pink", "disabled", "h-40"], 
							"html"	:	library.get("Property"),
							"attr"	:	{
								"data-action"	:	"info",
							}
						}));
						
						var count = 0;
						var countPropertySet = 0;

						if (d?.["data"]?.["propertySet"]?.length) {
							
							count = d["data"]["propertySet"].length;
						}
						
						toolbarLeft.append(element.create("div",{
							
							"class"	:	"count",
							"html"	:	count
							
						}));
						
						line.prepend(toolbarLeft);
						
						block.append(groupsForm);
						
						if (d?.["data"]?.["propertySet"]) {

							var item, header, headerText, option, tag, attr, action;
							var types = ["2", "3"];//списки
							
							var hrefStart = "/p/run/";
							var actionStart = {
								h: "table",
								a:{
									"name"		:	"propertyList",
									"action"	:	"view",
									"filter"	:	{
										
									},
									"sort"		:	{
										"fakeFieldName" : "ASC"
									},
									//"mode"		:	"toModal",

								}
							};
							
							var runAttr;
							var runRules;
							var list;
							var html;
							var i;
							var j;
							
							for (i = 0; i < d["data"]["propertySet"].length; i++) {

								list = null;
								html = "";
								attr = {
									"attr"	:	{
										"data-name"	:	"pr-" + d["data"]["propertySet"][i]["ID"]
									}
								};
								
								item = element.create("div", {"class" : "block"});
								
								headerText = d["data"]["propertySet"][i]["name"];
								
								if (
									types.includes(d["data"]["propertySet"][i]["type"])
								) {//списки
									
									action = actionStart;
									action["a"]["filter"] = {"parent" : d["data"]["propertySet"][i]["ID"]};
									
									//action["a"]["elementID"] = "row-optinList-add-"+d["data"]["optionSet"][i]["ID"];
									
									headerText += "&nbsp;<a href='"+hrefStart+tools.transformObjToStr(action)+"' target='_blank' class='btn disabled fr la la-16 la-plus h-24' title='Додати значення' style='margin-bottom:5px'></a>";
									// onclick='run.go(this, {class:\"RunTools\", method:\"rowAdd\"});return false'

								}

								if (
									d["data"]["propertySet"][i]?.["valueAfter"]
								) {/*поки залишимо*/
									
									headerText += " <span class='small fr'>["+d["data"]["propertySet"][i]["valueAfter"]+"]</span>";
								
								}

								if (
									types.includes(d["data"]["propertySet"][i]["type"])
								) {//списки

									tag = "select";
									
									if (
										d?.["p"]?.["controlSet"]
										&& Object.keys(d["p"]["controlSet"]).includes(d["data"]["propertySet"][i]["ID"])
									) {//нові типи контролів — в розробці на майбутнє
									
										switch (d["p"]["controlSet"][d["data"]["propertySet"][i]["ID"]]) {
											
											case "radioList":
												tag = "radioList";
											break;
											
											case "checkboxList":
												tag = "checkboxList";
											break;
											
										}
										
									}
									
									if (d?.["data"]["propertyList"]?.[d["data"]["propertySet"][i]["ID"]]) {//є свій власний список
										
										list = d["data"]["propertyList"][d["data"]["propertySet"][i]["ID"]];

									} else {//свого списку нема
										
										if (d["data"]["propertySet"][i]["runRules"]) {//є налаштування 	
											runRules = JSON.parse(d["data"]["propertySet"][i]["runRules"]);
											
											if (runRules?.["source"]) {//взяти дані з іншого списку
												
												if (
													runRules?.["source"]?.["propertyList"] 
													&& d?.["data"]["propertyList"][runRules["source"]["propertyList"]]) {
														list = d["data"]["propertyList"][runRules["source"]["propertyList"]];
												}
												;
											}

										}
									}
									
									option = [];
									
									if (d["data"]["propertySet"][i]["type"] == 2) {//вибір одного значення
										option.push({
											"value"	:	"",
											"html"	:	"—",
										});
										
									}
									
									if (list) {
										
										for (var j = 0; j < list.length; j++) {
											
											option.push({
												"value"	:	list[j][0],
												"html"	:	list[j][1],
											});
										}
									}
									
									switch (tag) {
										
										case "radioList":
											tag = "div";
											
											for (j = 0; j < option.length; j++) {

												html += "<label><input type='radio' data-name='"+attr["attr"]["data-name"]+"'>"+option[j]["html"]+"</label>";
												
											}
											
											delete(attr["attr"]["data-name"]);
											//html += "radioList";

											//console.log(tag);
										break;
										
										case "checkboxList":
											tag = "div";
											
											for (j = 0; j < option.length; j++) {

												html += "<label><input type='checkbox' data-name='"+attr["attr"]["data-name"]+"'>"+option[j]["html"]+"</label>";
												
											}
											
											delete(attr["attr"]["data-name"]);
											attr["class"] = "checkboxList";
										break;
										
										default:/*select*/
										
											attr["option"] = option;

											if (d["data"]["propertySet"][i]["type"] == 3) {
												
												attr["multiple"] = true;

											}
									}
									
								} else {//не список
									
									tag = "input";
									
									attr["attr"]["type"] = "text";
									
								}
								
								header = element.create("div", {
									"class"	:	"header",
									"html"	:	headerText
								});
								
								item.append(header);
								
								if (d["data"]["propertySet"][i]?.["runAttr"]) {
									
									runAttr = JSON.parse(d["data"]["propertySet"][i]["runAttr"]);
									
									for (const pr in runAttr) {
										
										attr["attr"][pr] = runAttr[pr];
										
									}
									
								}

								if (["input", "select"].indexOf(tag) !== -1) {//звичайні елементи
									
									var input = element.create(tag, attr);

									if (attr?.["attr"]?.["data-reaction"]) {
										
										input.addEventListener("input", function (e){reaction.go(e["srcElement"]);});
										input.addEventListener("focus", function (e){reaction.go(e["srcElement"]);});
									
									}

								} else {
									var input = element.create(tag, attr);
									input.innerHTML = html;
								}

								item.append(input);
								
								/*встановлюємо значення*/
								
								switch (d["data"]["propertySet"][i]["type"]) {
									
									case "1":/*input*/

										if (d?.["data"]?.["property"]?.[d["data"]["propertySet"][i]["ID"]]) {
											
											input.value = d["data"]["property"][d["data"]["propertySet"][i]["ID"]][0]["value"];
											
										}

										input.addEventListener("keypress", function() {
											
											if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
												event.preventDefault();
												var formO = event.target.closest("[data-type='form']");
												runTools.savePropertyToolbarData(form.returnData(formO), formO);
											}
											
										});
										
									break;
									
									case "2":/*один. вибір*/
										
										if (tag == "select") {
											
											if (d?.["data"]?.["property"]?.[d["data"]["propertySet"][i]["ID"]]) {
												
												input.value = d["data"]["property"][d["data"]["propertySet"][i]["ID"]][0]["value"];
											}
										}

										
									break;
									
									case "3": /*мн. вибір*/
									
										if (tag == "select") {
											
											if (input.querySelector("option")) {
												
												input.querySelector("option").selected = false;//знімаємо можливе виділення елементів
												
											}

											if (
												d?.["data"]?.["property"]?.[d["data"]["propertySet"][i]["ID"]]
											) {
												
												list = d?.["data"]?.["property"]?.[d["data"]["propertySet"][i]["ID"]];

												var headerText = "<span style='font-weight:normal' class='small'>&nbsp;["+list.length+"]&nbsp;</span>";
												header.innerHTML = header.innerHTML+headerText;

												var tmp;

												for (var iList = 0; iList < list.length; iList++) {
													
													tmp = input.querySelector("option[value='" + list[iList]["value"] + "']");
		
													if (tmp) {

														input.querySelector("option[value='" + list[iList]["value"] + "']").selected = true;
														
													}
												}
												
											}
										
										}
										
									break;
								}
								
								if (tag == "select") {
									
									if (
										d?.["p"]?.["selectAddon"]
										&& Object.keys(d["p"]["selectAddon"]).includes(d["data"]["propertySet"][i]["ID"])
									) {//підключаємо selectAddon для select

										switch (d["p"]["selectAddon"][d["data"]["propertySet"][i]["ID"]]) {
											case "slimSelect":
											
												var select = new SlimSelect({
													select	:	input,
												});
												
											break;
										}

									}

								}

								if (
									d["data"]["propertySet"][i]["addon"]
									&& d?.["data"]?.["addon"][d["data"]["propertySet"][i]["addon"]]
								) {
									
									var classReady = Factory.create("RunTools");
									
									if (classReady) {

										var addonValue = "";

										if (
											d["data"]["property"] != undefined
											&& d["data"]["property"][d["data"]["propertySet"][i]["ID"]] != undefined
										) {
											addonValue = d["data"]["property"][d["data"]["propertySet"][i]["ID"]][0][d["data"]["propertySet"][i]["addon"]];

										}

										var addon = classReady[d["data"]["propertySet"][i]["addon"]+"GetPropertyAddonData"](
											d["data"]["addon"][d["data"]["propertySet"][i]["addon"]],
											addonValue,
											d["data"]["propertySet"][i]["ID"]
										);
										console.log(addon);
										if (addon) {
											item.append(addon);
										}
									}

								}
								
								groupsForm.append(item);
							}
							
							var lineBottom = line.cloneNode(true);
							lineBottom.style.marginTop = "20px";
							
							var reloadButtonBottom = lineBottom.querySelector("[data-action='property-toolbar-reload']");
							
							var callbackF = function(p1, p2) {
								
								return function() {
									
									runTools.propertyToolbar(p1, p2);
									
								};
								
							};
							
							reloadButtonBottom.addEventListener("click", callbackF(config, block));
						
							groupsForm.append(lineBottom);
							
						}
						
					} else {
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					}
				}
			);
			

		}
		
		//block.style.width = "100%";

	}
	
	savePropertyToolbarData(data, formO) {

		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"savePropertyToolbarData",
			},
			data	:	data,
		};
		
		tools.work(1);
		ajax.start(args, formO).then(
		
			function(d) {
				
				d = ajax.end(d, formO); tools.work(0);
				
				if(d["info"]["success"]) {//успішно
					
					vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
					
				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);
	}
	
	savePropertyToolbarDataBtn (o) {
		
		var formO = o.closest("[data-type='form']");
		
		runTools.savePropertyToolbarData(form.returnData(formO), formO);
		
	}
	
	unitGetPropertyAddonData(data, value, prSet) {

		var tag = "select";
		
		var attr = {};
		var option = [];

		option.push({
			"value"	:	"",
			"html"	:	"—",
		});

		if (data) {
			
			for (var j = 0; j < data.length; j++) {

				option.push({
					"value"	:	data[j]["ID"],
					"html"	:	data[j]["value"],
				});
			}
		}

		attr["option"] = option;
		attr["attr"] = {
			//"data-valid"	:	"required",
			"data-name"		:	"pr-"+prSet+"|unit"
			
		};
		var addon = element.create(tag, attr);
		addon.value = value;
		return addon;
	
	}	
	
	tableRowAdd () {
		
		var tableAddBtn = document.querySelector("#content table[data-name] thead button[data-action='row-add']");
		
		if (tableAddBtn) {
			tableAddBtn.click();
		} 
		
	}
	
	unsetReadOnly(o) {
		o.removeAttribute("readonly");
	}
	
	unsetDisabled(o) {
		o.removeAttribute("disabled");
	}

	setPropertySEOName(o, language, indexName) {

		let text = o.closest("div").querySelector("div").textContent;
		let target = o.closest("form").querySelector("[name='fakeField-translate-"+indexName+"-"+language+"']");
		target.value = text;

	}
	
	jsonPropertyPrepareToolbar(config, block) {

		while (block.firstChild) {//видаляємо всі дочірні елементи
			block.removeChild(block.firstChild);
		}
		
		let ID = parseInt(config["ID"]);

		if (!isNaN(ID)) {//тільки при редагуванні батьківського документу
			
			var args = {
				h	:	"exec",
				a	:	{
					name	:	"getJsonPropertyPrepareToolbar",
					"work"	:	1
				},
				p	:	{
					ID	:	ID,
				}
			};
			
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);
					
					if (d["info"]["success"]) {
						
						for (let i = 0; i < d["languagesID"].length; i++) {
							
							let panel = element.create("div", {
								"class"	:	"line",
								"attr"	:	{
									"style"	:	"justify-content:start",
								}
							});
							let text = element.create("div", {
								"html"	:	d["data"][d["languagesID"][i]]
							});

							let button = element.create("button", {
								"attr"	:	{
									"type"		:	"button",
									"onclick"	:	"runTools.setPropertySEOName(this,"+d["languagesID"][i]+","+d["indexName"]+")",
									"title"		:	"to Name",
									"style"	:	"margin-right:10px",
								},
								"html"	:	d["languagesName"][d["languagesID"][i]]
							});
							
							panel.append(button);
							panel.append(text);
							block.append(panel);
						}

						block.classList.remove("displayNone");
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
					

				}
				
			);
		}
		

		return block;

	}
	
	toggleUploadToolbarTranslate(o) {
		o.closest(".item").classList.toggle("tr-view");
	}
	
	sortImageGroupBy(o, table, parent, sort) {
		
		let args = {
			h	:	"exec",
			a	:	{
				"name"	:	"sortImageGroupBy",//method
				"work"	:	1
			},
			p	:	{
				"table"		:	table,
				"parent"	:	parent,
				"sort"		:	sort,
			},
		};

		ajax.start(args, o).then(
		
			function(d) {
				
				d = ajax.end(d, o);
				
				if (d["info"]["success"]) {

					vNotify.info({text: d["info"]["text"],visibleDuration:10000});
					
					let reloadBtn = o.closest(".toolbar").querySelector("button[data-action='image-toolbar-reload']");

					reloadBtn.click();
					
				} else {//error
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
		);
		
	}
	
	dataTextToModal(o) {
		
		let text = o.getAttribute("data-text");
		if (text) {
			tools.toModal ({
				"header"	:	"",
				"html"		:	text
			});		
		}
		
	}

	playAudio(name) {
		
		/*const audioUrl = "/sound/"+name+".mp3";
		
		fetch(audioUrl)
		.then(response => {
			if (response.ok) {
				
			// Файл існує, можна його програвати
			const audio = new Audio(audioUrl);
			audio.play();
			}
		})
		.catch(error => {
			//console.error('Помилка при завантаженні файлу:', error);
		});*/

	}
	
	cssMigrationGet() {

		let args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"cssMigrationGet",
			},

		};
		
		ajax.start(args).then(
		
			function(d) {
				
				d = ajax.end(d);
				
				if (d["info"]["success"]) {//успішно

					if (d?.["info"]?.["text"]) {
						
						vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
					}
					
				} else {
					
					if (d?.["info"]?.["text"]) {
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					}
					
				}
			}
			
		);		
	}
	
	cssMigrationSet() {

		let args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"cssMigrationSet",
			},

		};
		
		ajax.start(args).then(
		
			function(d) {
				
				d = ajax.end(d);
				
				if (d["info"]["success"]) {//успішно

					if (d?.["info"]?.["text"]) {
						
						vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
					}
					
				} else {
					
					if (d?.["info"]?.["text"]) {
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					}
					
				}
			}
			
		);		
	}

	generateReportCSV(o) {
		
		let params = o.getAttribute("data-params");
		if (params) {
			
			let p = tools.transformStrToObj(params);
			
			var args = {
				h	:	"exec",
				a	:	{
					work	:	1,
					name	:	"generateReportCSV",
				},
				p	:	p

			};
				
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);
					
					if (d["info"]["success"]) {//успішно

						vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
						
					} else {
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					}
				}
				
			);
		}
	}

	generateFilePath(o, table) {

		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"generateFilePath",
			},
			p	:	{
				table:	table,
			}

		};
			
		ajax.start(args).then(
		
			function(d) {
				
				d = ajax.end(d);
				
				if (d["info"]["success"]) {//успішно

					vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
					run.go();
				} else {
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
				}
			}
			
		);

	}

	setBlockTextareaHljs(o) {

		let block = o.closest(".block");
		let textarea = block.querySelector("textarea");
		let hljsEditor = block.querySelector("div.code-hljsEditor");
		
		if (!textarea) {// не знайшли
			return;
		}
		if (hljsEditor) {
			hljsEditor.remove();
		}
		
		hljsEditor = element.create("div", {
			"class"	:	"code-hljsEditor",
			"attr"	:	{
				"contenteditable"	:	"true",
				"spellcheck"		:	"false",
				"style"				:	"border:1px solid #D8D8D8;border-radius: 0.25rem;height:50vh;padding:10px;font-family: monospace;white-space: pre-wrap;min-height:50vh;overflow-y:scroll;font-size:16px;width:100%",
			},
		});

		hljsEditor.addEventListener('keydown', (e) => {
			if (e.key === 'Tab') {
				e.preventDefault();

				document.execCommand('insertText', false, "\t");
			}
		});
		

		textarea.classList.add("dN");

		block.append(hljsEditor);
		
		hljsEditor.addEventListener("input", () => {

			// Отримуємо текст із hljsEditor, замінюючи HTML-переноси на \n
			let text = hljsEditor.innerHTML
				.replace(/<br\s*\/?>/gi, "\n") // Замінюємо <br> на \n
				.replace(/<\/?div>/gi, "\n")   // Замінюємо <div> на \n
				.replace(/&nbsp;/gi, " ")       // Замінюємо &nbsp; на пробіл
				.replace(/<[^>]+>/g, "");       // Видаляємо інші HTML-теги

			// Очищаємо від подвійних переносів рядків, якщо потрібно
			text = text.replace(/\n\s*\n/g, "\n").trim();

			const entities = {
				"&amp;": "&",
				"&lt;": "<",
				"&gt;": ">",
				"&quot;": "\"", // Виправлено: правильна сутність для "
				"&#39;": "'",   // Виправлено: правильна сутність для '
			};

			// Ітеруємо ключі об’єкта за допомогою for...in
			for (let key in entities) {
				text = text.replaceAll(key, entities[key]); // Використовуємо replaceAll для заміни всіх входжень
			}
			
			// Передаємо текст у textarea
			textarea.value = text;
			
		});


		hljsEditor.innerHTML = hljs.highlight(textarea.value, {
			language	:	"css",
		}).value;
	}
}

class TableModify {
	
	oneZero(text, field, row, config) {
		
		var hrefStart = "/p/run/";
		var state = parseInt(text);
		var btnClass = "la-toggle-off";
		
		if (state == 1) {
			btnClass = "la-toggle-on";
		}
		
		var action = {
			h: "exec",
			a:{
				"name"		:	"oneZeroToggle",
				"field"		:	field,
				"ID"		:	row["ID"],
				"table"		:	config["oneZero"],
			}
		};
		
		return "<button type='button' class='la la-16 h-30 "+btnClass+"' onclick='run.go(this)' data-href='"+hrefStart+tools.transformObjToStr(action)+"' data-state='"+state+"'></button>";
	}
	
	radioGroupSwitcher(text, field, row, config, addData) {
		
		let hrefStart = "/p/run/";
		let state = parseInt(text);
		let html = "—";
		let i = 0;
		let checked;
		let labelAttr;
		let value;
		let table = config["radioGroupSwitcher"]["table"];
		let ID = row["ID"];
		let name = "rgs-"+table+"-"+ID;

		const action = {
			h: "exec",
			a:{
				"name"		:	"radioGroupSwitcherSet",
				"field"		:	field,
				"ID"		:	ID,
				"table"		:	table,
			}
		};

		let valueList = addData[config["radioGroupSwitcher"]["addData"]][0] ?? null;
		let textList = addData[config["radioGroupSwitcher"]["addData"]][1] ?? null;
		
		if (valueList !== null) {
			
			html = "";
			for (i = 0; i < valueList.length; i++) {
				checked = "";
				labelAttr = "";
				value = parseInt(valueList[i]);
				if (value === state) {
					checked = " checked";
					labelAttr = " class='checked'";
				}
				html += "<label"+labelAttr+"><input type='radio' value='"+valueList[i]+"' name='"+name+"' onclick='run.go(this)' data-href='"+hrefStart+tools.transformObjToStr(action)+"'"+checked+">"+textList[i]+"</label>";
			}
			html = "<div class='toolbar rgs'>"+html+"</div>";
		}

		return html;
	}
	
	articleName (text, field, row, config, addData) {

		var addDataName = null;
		var addDataUrl = null;
		var searchValue = parseInt(row["ID"]);
		var languageCount = 0;
		
		if (addData?.[config?.["articleName"]?.[1]]) {//url
			addDataUrl = addData[config["articleName"][1]];
		}
		
		if (addDataUrl && addDataUrl["languages"] != undefined) {
			languageCount = Object.keys(addDataUrl["languages"]).length;
		}
		
		if (addData?.[config?.["articleName"]?.[0]]) {//name

			addDataName = addData[config["articleName"][0]];
			
			var testIndexName = addDataName[0].indexOf(searchValue);
			
			if (testIndexName !== -1) {//знайшлось name
				
				text = addDataName[1][testIndexName];

			}
		}

		if (addDataUrl && addDataUrl?.["url"]?.[searchValue]) {
			
			var urls = "";
			var language;
			
			for (var i = 0; i < addDataUrl["lOrder"].length; i++) {
				
				language = addDataUrl["lOrder"][i];
				
				if (addDataUrl?.["url"]?.[searchValue]?.[language]) {

					urls += " <a href='" + addDataUrl["url"][searchValue][language] + "' target='_blank' class='la la-16 h-20 la-external-link light'>"; 
					
					if (languageCount > 1) {

						urls += addDataUrl["languages"][language]["ISO"];
					
					}
					
					urls += "</a>";
				}
				
			}
			
			text += urls;
		}
		
		if (row?.["isParent"] && row["isParent"] == "1") {

			text += "<button type='button' class='las la-filter la-16 h-20' style='display:inline-block;margin-right:5px' title='"+library.get("Set  To Filter")+"' onclick='js.setIDToFilter(this, {value:"+row["ID"]+",filter:\"parent\"})'></button>";
		}
		
		return text;
	}
	
	fromAddData(text, field, row, config, addData) {

		if (addData?.[config?.["fromAddData"]]) {

			var searchValue;

			if (addData[config["fromAddData"]]?.[2]?.["setField"]) {//встановлено додаткове поле для індекса по ньому
				
				searchValue = parseInt(row[addData[config["fromAddData"]][2]["setField"]]);
				
			} else {
				
				searchValue = parseInt(text);
				
			}
			
			var testIndex = addData[config["fromAddData"]][0].indexOf(searchValue);
			
			if (testIndex !== -1) {//знайшлось

				text = addData[config["fromAddData"]][1][testIndex];
				
				if (config?.["wrap"]) {
					
					text = config["wrap"][0] + text + config["wrap"][1];
				}
				
			} else {
				
				text = "—";
			}
		}
		
		if (config?.["addon"]?.["method"]) {

			let m = config["addon"]["method"].split(".");
			text += window[m[0]][m[1]](searchValue, field, row, config, addData);
		}
		
		if (config?.["set"]) {

			let m = config["set"].split(".");
			text = window[m[0]][m[1]](text, field, row, config);
		}
		
		return text;
	}
	
	fromAddDataSet(text, field, row, config, addData) {//поле в базі даних типу set: 1,2…

		if(addData?.[config?.["fromAddDataSet"]]){
			var searchValue;
			var testIndex;
			
			if(addData[config["fromAddDataSet"]][2] != undefined && row[addData[config["fromAddDataSet"]][2]] != undefined){//є додаткове поле для індекса по ньому
				searchValue = row[addData[config["fromAddDataSet"]][2]];
			} else {
				searchValue = text;
			}
			
			searchValue = searchValue.split(",");
			text = "";
			for(var i = 0; i < searchValue.length; i++) {
				testIndex = addData[config["fromAddDataSet"]][0].indexOf(parseInt(searchValue[i]));
				if(testIndex !== -1){//знайшлось
					if(i){//не перший — додаємо кому
						text += ", ";
					}
					text += addData[config["fromAddDataSet"]][1][testIndex];
				}
			}

		}
		return text;
	}
	
	fromAddDataCommaSeparated(text, field, row, config, addData) {//поле в базі даних varchar

		if (addData?.[config?.["fromAddDataCommaSeparated"]]) {

			var searchValue;
			var testIndex;

			if (
				addData[config["fromAddDataCommaSeparated"]][2] != undefined 
				&& row[addData[config["fromAddDataSet"]]] != undefined
				&& row[addData[config["fromAddDataSet"]][2]] != undefined) {//є додаткове поле для індекса по ньому
				
				searchValue = row[addData[config["fromAddDataCommaSeparated"]][2]];
				
			} else {
				
				searchValue = text;
				
			}
			
			searchValue = searchValue.split(",");
			text = "";
			for (var i = 0; i < searchValue.length; i++) {
				
				testIndex = addData[config["fromAddDataCommaSeparated"]][0].indexOf(parseInt(searchValue[i]));
				if (testIndex !== -1) {//знайшлось
					if (i) {//не перший — додаємо кому
						text += ", ";
					}
					text += addData[config["fromAddDataCommaSeparated"]][1][testIndex];
				}
			}
			
			if (config?.["addon"]?.["method"]) {

				let m = config["addon"]["method"].split(".");

				if (config?.["addon"]?.["replace"]) {
					text = window[m[0]][m[1]](searchValue, field, row, config, addData);
				} else {
					text += window[m[0]][m[1]](searchValue, field, row, config, addData);
				}
				
			}
			
		}
		return text;
	}
	
	modifyWrap(text, field, row, config) {

		return config["modifyWrap"][0] + text + config["modifyWrap"][1];
	}
	
	modifyWrapIfNotEmpty(text, field, row, config) {
		
		if (text == "") {
			return "";
		}
		
		return config["modifyWrapIfNotEmpty"][0] + text + config["modifyWrapIfNotEmpty"][1];
		
	}
	
	modifyReplace(text, field, row, config) {/*?*/
		return config["modifyReplace"];
	}
	
	modifyText(text, field, row, config) {
		
		let textH = text.replace(/\"/g, "&quot;");
		let string = config["modifyText"].replace(/{text}/g, text);
		string = string.replace(/{textQ}/g, textH);
		return string;
	
	}
	
	modifyTextLong(text, field, row, config) {

		if (text.length <= config["modifyTextLong"]["maxLenght"]) {
			return text;
		}

		let textH = text.replace(/\'/g, "&#8217;");
		
		let style ="";
		if (config["modifyTextLong"]?.["style"]) {
			style = " style='"+config["modifyTextLong"]["style"]+"'";
		}
		
		return "<div title='"+textH+"' class='longT'"+style+">"+text+"</div>";

	}
	
	modifyReplaceLineBreak(text, field, row, config) {
		return text.replace(/\n/g,"<br>");
	}
	
	modifySVG(text, field, row, config, addData) {
		if (!addData?.["modifySVG"]?.[0]) {
			return "";
		}
		
		text = "";
		let ID = parseInt(row["ID"]);
		let svg = [
			"<div class='toolbar'><svg onclick='runTools.viewSVGInModal(this)' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' title='"+library.get("View SVG")+"' viewbox='",
			"'>",
			"</svg></div>",
		];

		let index = addData["modifySVG"][0].indexOf(ID);
		
		if (index !== -1) {
			
			let tmp = addData["modifySVG"][1][index].split("|");
			text += svg[0] + tmp[0] + svg[1] + tmp[1] + svg[2];
			
		}

		return text;
	}
	
	getImage (text, field, row, config, addData) {
		
		var text = "";
		
		if (addData?.["listImage"]?.[row["ID"]]) {

			text = "<div class='toolbar'><div class='image' style='cursor:pointer;background-image:url("+addData["listImage"][row["ID"]][1]+ "?"+Date.now()+")' onclick='runTools.viewImageInModal(this)' data-image='"+addData["listImage"][row["ID"]][0]+"'></div></div>";

		}

		return text;
	}

	subordinateTable (text, field, row, config, addData) {
		
		var text = "";
		var html, count, addon, action, need, conditionField;

		for (var table in config["subordinateTable"]) {
			
			if (addData?.["subordinateTable"]?.[table]) {
				
				need = true;//за замовчуванням виводимо
				
				if (config?.["subordinateTable"]?.[table]?.["conditionField"]) {
					
					conditionField = Object.keys(config["subordinateTable"][table]["conditionField"])[0];
					if (
						row?.[conditionField] 
						&& !config["subordinateTable"][table]["conditionField"][conditionField].includes(row[conditionField])
					) {

						need = false;
						
					}
				}

				if (need) {

					html = config["subordinateTable"][table]["html"];
					
					count = "";
					if (addData?.["subordinateTable"]?.[table]?.["data"]?.[row["ID"]]) {
						count = "<span class='count'>" + addData["subordinateTable"][table]["data"][row["ID"]] + "</span>";

					}
					
					addon = "";
					if (addData["subordinateTable"][table]["addon"] != undefined && addData["subordinateTable"][table]["addon"][row["ID"]] != undefined) {
						
						addon = addData["subordinateTable"][table]["addon"][row["ID"]];
						
					}

					action = "";

					if (
						config?.["subordinateTable"]?.[table]?.["section"]
					) {
						
						var fieldSubmission = "parent";
						
						if (config["subordinateTable"][table]?.["fieldSubmission"]) {
							
							fieldSubmission = config["subordinateTable"][table]["fieldSubmission"];
							
						}

						var params = {
							"h"	:	"table",
							"a"	:	{
								"name"		:	table,
								"section"		: config["subordinateTable"][table]["section"],
								"target"		: config["subordinateTable"][table]["target"] ?? 1,
								"filterFixed"	:	[
									fieldSubmission
								]
							}
						};
						
						params["a"]["filter"] = {};
						params["a"]["filter"][fieldSubmission] = /*"=|" + */row["ID"];

						if (addData["subordinateTable"][table]["useSubordinatedTable"] != undefined) {
							
							params["a"]["filter"]["table"] = /*"=|" + */addData["subordinateTable"][table]["useSubordinatedTable"];
							params["a"]["filterFixed"].push("table");
							
						}
						
						if (addData["subordinateTable"][table]["toFieldForSelect"] != undefined) {
							
							for (var fieldFS in addData["subordinateTable"][table]["toFieldForSelect"]) {

								params["a"]["fieldForSelect"] = {};
								params["a"]["fieldForSelect"][fieldFS] = addData["subordinateTable"][table]["toFieldForSelect"][fieldFS][row["ID"]];
								
							}
							
						}

						action = " data-href='" + tools.transformObjToStr(params) + "' onclick='runTools.insertHModal(this);return false'";

					}

					text += html.replace("{count}", count).replace("{addon}", addon).replace("{action}", action);
					
				}

			}
		}

		if (text) {
			
			text = "<div class='toolbar'>" + text + "</div>";
			
		}
		return text;
	}

	emptyIfZero(text, field, row, config) {

		if (text == "0") {
			text = "";
		}

		return text;

	}
	
	modifyDate(text, field, row, config) {

		let textA = text.split("-");
		if (textA[2] == "00" && textA[1] == "00" && textA[0] == "0000" ) {
			return "—";
		}
		
		let wrap = ["", ""];
		if (config?.["modifyDate"]?.["wrap"]) {
			wrap = config?.["modifyDate"]["wrap"]; 
		}

		return wrap[0]+textA[2]+"."+textA[1]+"."+textA[0]+wrap[1];

	}
	
	modifyTime(text, field, row, config) {

		let textA = text.split(":");

		let wrap = ["", ""];
		if (config?.["modifyTime"]?.["wrap"]) {
			wrap = config?.["modifyTime"]["wrap"]; 
		}

		return wrap[0]+textA[0]+":"+textA[1]+wrap[1];

	}
	
	modifyDateTime(text, field, row, config) {
		if (text === null) {
			return "null";
		}
		text = text.split(" ");
		let date = tableModify.modifyDate(text[0]);
		let time = tableModify.modifyTime(text[1]);
		
		let wrap = ["", ""];
		if (config?.["modifyDateTime"]?.["wrap"]) {
			wrap = config?.["modifyDateTime"]["wrap"]; 
		}
		
		let t = "";
		t += date;
		
		if (time != "00:00") {
			t += " <span class='small'>/ "+time+"</span>";
		}
		
		return wrap[0]+t+wrap[1];

	}

	prListParams(text, field, row, config) {

		let params = {
			"pr"	:	{}
		};
		params["pr"][row["parent"]] = [row["ID"]];

		return JSON.stringify(params);
	}
		
	modifySVGClipboard(text, field, row, config) {
		let textM = "";
		
		textM 
		+= "<div class='toolbar'>" 
			+ "<button type='button' class='la la-24 la-copy h-40' title='Copy Sprite To Clipboard' onclick='tools.toClipboard(\"[svg name=*"+text+"*/]\",true)'>sprite"
			+ "</button>"
			+ " "  
			+ "<button type='button'  class='la la-24 la-copy h-40' title='Copy CSS To Clipboard' onclick='tools.toClipboard(\"[svg name=*"+text+"* class=*"+text+"*/]\",true)'>css"
			+ "</button>"
			+ " "  
			+ "<button type='button'  class='la la-24 la-copy h-40' title='Copy Img To Clipboard' onclick='tools.toClipboard(\"[svg name=*"+text+"* tag=*img*/]\",true)'>img"
			+ "</button>"
			+ "&nbsp;&nbsp;&nbsp;" 
			+ text
		+ "</div>"

		;
		return textM;
	}

}

class Filter {

	filterForm(data, args, config, addData) {
		
		if (data === null) {
			
			return null;
			
		}

		if (args["a"]["section"] == undefined) {//фільтр головної таблиці - показуємо кнопку показа/ховання панелі фільтрів
			
			document.querySelector("header [data-action=filter-toggle]").classList.remove("displayNone");
			
		}
				
		var action = {
			"h"		: "js",
			"a"	:	{
				"name"		:	"setFilter",
			}
		};
		
		if (data?.["args"]?.["a"]?.["section"]) {
			
			action["a"]["section"] = data["args"]["a"]["section"];
			
			var groups = element.create("div",{
				
				"class"		:	["groups"],
				"attr"	:	{
					"data-type"		:	"form",
					"data-action"	:	tools.transformObjToStr(action),
				}
				
			});
			
		} else {
			
			var groups = element.create("form",{
				"class"	:	"groups",
				"attr"	:	{
					"method"	:	"post",
					"action"	:	tools.transformObjToStr(action),
					"onsubmit"	:	"form.go(this);return false;",
				}
			});	
		}
		
		if (!data?.["args"]?.["a"]?.["section"]) {
			
			var line = element.create("div", {"class":"line"});
			groups.append(line);
			
			var toolbarHeader = element.create("div", {"class":"toolbar"});
			var filterHeader = element.create("div", {"class":"header","html":data["header"]});
			
			toolbarHeader.append(filterHeader);
			line.append(toolbarHeader);
		}

		if (data["args"]["a"]["section"] == undefined) {//ці кнопки тільки для основного фільтру
			
			var toolbarBtns = element.create("div", {"class":"toolbar"});
			
			toolbarBtns.append(element.create("button", {
				"class"	:	["las", "la-24", "la-shower", "h-30"],
				"attr"	:	{
					"type"		:	"button",
					"onclick"	:	"filter.cancelAllValues(this)",
					"title"		:	library.get("Clear") + " " + library.get("Filters").toLowerCase()
				}
			}));
			
			toolbarBtns.append(element.create("button", {
				"class"	:	["la", "la-24", "la-close", "h-30"],
				"attr"	:	{
					"type"		:	"button",
					"onclick"	:	"runTools.filterToggle()",
					"title"		:	library.get("Close") + " " + library.get("Filters").toLowerCase()
				}
			}));
			
			line.append(toolbarBtns);
		}
		
		filter.filterBefore(data, args, config, addData);//це врізка значень в панель над таблицею
		
		var block, header, input, tmp, tmpSelected, tag, line;
		
		var controls = element.create("div", {
			"class"	:	"controls"
		});

		for (var name in data["data"]) {
			
			var blockElement = null;
			
			if (data["data"][name]["blockElement"] != undefined) {
				
				blockElement = data["data"][name]["blockElement"];
				
			}
			
			if(blockElement == null) {
				
				blockElement = {};
			
			}
			
			blockElement["class"] = "block";
			block = element.create("div",blockElement);

			header = element.create("div",{
				"class"	:	"header"
			});
			header.append(data["data"][name]["header"]);
			
			var tagElementAttr = {};
			
			if (data["data"][name]["element"] != undefined) {
				
				tagElementAttr = data["data"][name]["element"];
				tag = data["data"][name]["element"]["tag"];
				delete tagElementAttr["tag"]; 
			
			} else {
				
				tag = "input";
			
			}

			if (tagElementAttr["attr"] == undefined) {
				
				tagElementAttr["attr"] = {};
			
			}
			
			if (data?.["args"]?.["a"]?.["section"]) {
				
				tagElementAttr["attr"]["data-name"] = name;
				
			} else {
				
				tagElementAttr["attr"]["name"] = name;
			}
			
			if (tag == "select") {
				
				if(tagElementAttr["option"] == undefined){
					console.log("select "+name+" need element.option");
				} else {//встановлено метод метод для встановлення option
					if (typeof runTools[Object.keys(tagElementAttr["option"])[0]] == "function") {

						tagElementAttr["option"] = runTools[Object.keys(tagElementAttr["option"])[0]](Object.values(tagElementAttr["option"])[0], addData);
						
						if (args["a"]?.["filterFixed"] && args["a"]["filterFixed"].indexOf(name) !== -1) {
							tagElementAttr["disabled"] = true;
						}
					}
				}
				//console.log(tagElementAttr);
			}

			var tmpInputValue = null;
			var tmpSpecValue = null;

			if (args["a"]?.["filter"]?.[name]) {

				tmp = tools.explode(args["a"]["filter"][name], "|", 2);
				if (tmp?.[1]) {

					tmpSpecValue = tmp[0]+"|";
					tmpInputValue = tmp[1];
					
				} else {
					tmpInputValue = tmp[0];
				}

			}

			line = null;

			if (tag == "input" || tag == "select") {
				
				var specOption = null;
				
				if (data["data"][name]?.["specOption"]) {
					
					specOption = data["data"][name]["specOption"];
					
				} else {
					
					if (tag == "input") {//автоматично для input за замовчуванням
						
						specOption = {
							"="		:	["=|", library.get("Equal")],
							"*—*"	:	["*-*|", library.get("Contains")],
							/*"IN"	:	"IN|",
							"!="	:	"!=|",
							"-*"	:	"-*|",
							"*-"	:	"*-|",
							"<"		:	"<|",
							">"		:	">|",
							"<="	:	"<=|",
							">="	:	">=|",*/
						};
						
					}
				}

				if (specOption !== null) {

					var specAttr = {
						"tabindex"	:	"-1",
						"data-spec"	:	"1",
					}
					
					if (data?.["args"]?.["a"]?.["section"]) {
						
						specAttr["data-name"] = "spec-"+name;
						
					} else {
						
						specAttr["name"] = "spec-"+name;
						
					}
					
					var spec = element.create("select", {
						"attr"	:	specAttr
					});
					
					if (args["a"]?.["filterFixed"] && args["a"]["filterFixed"].indexOf(name) !== -1) {
						
						spec.disabled = true;
					
					}

					for (var i in specOption) {
						
						tmpSelected = false;
						if (tmpSpecValue !== null && tmpSpecValue == specOption[i][0]) {

							tmpSelected = true;
							
						}

						spec.append(element.create("option", {
							"html"		:	i,
							"value"		:	specOption[i][0],
							"selected"	:	tmpSelected,
							"attr"		:	{
								"title":specOption[i][1]
							}
						}));
					}
					line = element.create("div",{
						"class"	:	"line"
					});
					
				}

			}
			
			block.append(header);
			
			input = element.create(tag,tagElementAttr);

			if (tag == "input" && data?.["args"]?.["a"]?.["section"]) {//для не основного фільтру відбиваємо відправки основної форми по Enter в іnput
				
				input.addEventListener("keypress", function(e) {
					
					if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
						
						e.preventDefault();
						tools.submitDataForm(this);//організували відправку форми по enter
						
					}
					
				});
			}
			
			if (tagElementAttr?.["attr"]?.["data-reaction"]) {
				
				input.addEventListener("input", function (e){reaction.go(e["srcElement"]);});
				input.addEventListener("focus", function (e){reaction.go(e["srcElement"]);});
			
			}

			if (args["a"]?.["filterFixed"] && args["a"]["filterFixed"].indexOf(name) !== -1) {
				
				input.readOnly = true;
			
			}
			
			if (line !== null) {
				
				line.append(spec);
				line.append(input);
				block.append(line);
				
			} else {
				
				block.append(input);
				
			}
			
			if (tmpInputValue !== null) {
				
				if (tagElementAttr?.["multiple"]) {
					
					let optionList = tmpInputValue.split(",");
					if (optionList.length > 0) {
						if (input.querySelector("option[value='']")) {
							
							input.querySelector("option[value='']").selected = false;
							
						}
						for (let i = 0; i < optionList.length; i++) {

							input.querySelector("option[value='"+optionList[i]+"']").selected = true;
							
						}
					}
				
				}
				else {

					input.value = tmpInputValue;
				}
				
				if (tagElementAttr?.["attr"]?.["data-addon"]) {
					
					switch (tagElementAttr["attr"]["data-addon"]) {
						case "clearInputBtn":
						
							block.append(element.create("button", {
								"class"	:	["la", "la-close", "la-24"],
								"attr"	:	{
									"type"			:	"button",
									"onclick"		:	"runTools.clearBlockInput(this)",
									"data-action"	:	"clear-block-input"
								}
							}));
							
						break;
					}
					

					
				}
				
			}
			
			if (tagElementAttr["attr"] != undefined && tagElementAttr["attr"]["data-addon"] != undefined) {
				
				switch (tagElementAttr["attr"]["data-addon"]) {
					
					case "slim":
					
						if (tagElementAttr["multiple"] != undefined) {
							
							var select = new SlimSelect({
								select			:	input,
								closeOnSelect	: false
							});
							
						} else {
							
							var select = new SlimSelect({
								select	:	input,
							});
							
						}
						
					break;
					
				}
			}
			
			controls.append(block);
		}
		

		var selects = groups.querySelectorAll("select:not([data-spec])");
		var countSelects = selects.length;
		
		if (countSelects == 1) {//в фільтрах тільки один select - додаємо подію сабміта форми на change
			
			selects[0].addEventListener("change", function () {
				form.go(groups);
			});
			
		}
		
		if (data?.["args"]?.["a"]?.["section"]) {
			
			var submit = element.create("button",{
				"html"	:	library.get("Apply"),
				"class"	:	"primary",
				"attr"	:	{
					"type"		:	"submit",
					"onclick"	:	"tools.submitDataForm(this)"
				}
			});
			
		} else {
			
			var submit = element.create("button",{
				"html"	:	library.get("Apply"),
				"class"	:	"primary",
				"attr"	:	{
					"type"		:	"submit",
				}
			});
			
		}

		controls.append(submit);
		
		let spoiler = null; 
		
		if (data?.["args"]?.["a"]?.["section"]) {
			
			spoiler = element.create("div", {
				"class"	:	"spoiler"
			});
			
			let spoilerHeader = element.create("div", {
				"class"	:	"header"
			});
			let spoilerBody = element.create("div", {
				"class"	:	"body"
			});
			
			spoilerHeader.append( element.create("div", {
				"class"	:	"headermore",
				"html"	:	library.get("filtersShow"),
			}));
			spoilerHeader.append( element.create("div", {
				"class"	:	"headerless",
				"html"	:	library.get("filtersHide"),
			}));
			
			spoiler.append(spoilerHeader);
			spoilerBody.append(controls);
			spoiler.append(spoilerBody);
			
		}
		
		if (spoiler === null) {
			
			groups.append(controls);
			
		} else {
			
			groups.append(spoiler);
			tools.spoilerInit(spoiler);
			
		}
		
		if (config?.["filterForm"]) {
			
			if (config?.["filterForm"]?.["afterbegin"]) {
				
				groups.insertAdjacentHTML("afterbegin", config["filterForm"]["afterbegin"]);
				
			}
			if (config?.["filterForm"]?.["beforeend"]) {
				
				groups.insertAdjacentHTML("beforeend", config["filterForm"]["beforeend"]);
				
			}

		}
		return groups;
	}

	
	filterBefore(data, args, config, addData) {

		if (args?.["a"]?.["section"]) {

			var applyFilter = document.querySelector("#e" +args["a"]["mode"] + "ArticleBefore" + args["a"]["elementID"] + " [data-action='apply-filter']");
			var applyFilterLabel = null;
			
		} else {

			var applyFilter = document.querySelector("[data-action='apply-filter']");
			var applyFilterLabel = document.querySelector("[data-action='filter-toggle']");
			
		}


		if (applyFilter) {
			
			while (applyFilter.firstChild) {//видаляємо всі дочірні елементи
				
				applyFilter.removeChild(applyFilter.firstChild);
				
			}
			if (applyFilterLabel) {
				
				applyFilterLabel.innerHTML = "";
			
			}
			
			var block, value, method;

			if (args["a"]["filter"] != undefined) {//є встановлені фільтри

				if (applyFilterLabel){
					
					applyFilterLabel.innerHTML = "<span class='count'>" + Object.keys(args["a"]["filter"]).length + "</span>";
					
				}


				for (var name in args["a"]["filter"]) {//обходимо
					
					if(data?.["data"]?.[name]) {

						block = element.create("div");
						
						if (data["data"][name]["header"] != undefined) {
							
							block.append(element.create("div", {
								"class"	:	"name",
								"html"	:	data["data"][name]["header"]
							}));
							
						}
						
						value = args["a"]["filter"][name].replace("|", "");
						value = value.replace("IN", "IN ");
						value = value.replace("*-*", "");

						if (config?.["filter"]?.[name]?.["applyFilter"]) {
							
							method = Object.keys(config["filter"][name]["applyFilter"])[0];
							
							if (filter[method] != undefined) {
								
								value = filter[method](value, Object.values(config["filter"][name]["applyFilter"])[0], addData);

							}
							
						}

						block.append(element.create("div", {
							"class"	:	"value",
							"html"	:	value,
							"title"	:	data["data"][name]["header"]+value,
						}));

						if (args["a"]["filterFixed"] == undefined || args["a"]["filterFixed"].indexOf(name) === -1) {
							
							block.append(element.create("button", {
								"class"	:	["la", "la-16", "la-close", "h-24"],
								"attr"	:	{
									"onclick"	:	"filter.cancelValue(this)",
									"data-name"	:	name,
									"type"		:	"button",
									"title"		:	library.get("Cancel"),
								}
							}));
							
						}

						applyFilter.append(block);
						
					}
				}
				
				applyFilter.classList.remove("displayNone");
				
			} else {
				
				applyFilter.classList.add("displayNone");
			
			}
		}
	}

	cancelAllValues(o){
		
		var inputs = o.closest("form").querySelectorAll("input[name], select[name]");
		
		if (inputs) {
			for (let i = 0; i < inputs.length; i++) {
				switch (inputs[i].tagName){
					case "SELECT":
						if(inputs[i].options != undefined && inputs[i].options[0] != undefined){
							inputs[i].options[0].selected = true;
						}
					break;
					
					default:
						inputs[i].value = "";
				}
			}
		}
	}
	
	cancelValue(o) {
		
		var name = o.getAttribute("data-name");
		
		if (name) {

			if (o.closest("section")) {
				
				var filterForm = o.closest("section").querySelector("[data-id='eContentBefore']");
				
			} else {
				
				var filterForm = document.querySelector("aside [data-id='eASide'] form");
				
			}

			if (filterForm) {

				var submit = filterForm.querySelector("button.primary");
				var input = filterForm.querySelector("[name='"+name+"']");
				
				if (submit && input) {

					switch (input.tagName) {
						
						case "SELECT":
						
							if (input.options != undefined && input.options[0] != undefined) {
								input.options[0].selected = true;
							}
							
						break;
						
						default:
							input.value = "";
					}

					submit.click();
					runTools.filterToggle();
				}
			}

		}
		
	}

	valueGetFromAddData (value, key, addData){

		if (addData[key] != undefined) {

			var index = addData[key][0].indexOf(parseInt(value.replace("=", "").trim()));
			if (index !== -1) {
				
				value = ": " + addData[key][1][index];
				
			}
			
		}
		
		return value;
	}
	
}

class Js {
	
	go(args, o) {
		
		if (args["a"]["name"] in js) {
			
			return js[args["a"]["name"]](args, o);
			
		} else {
			
			vNotify.error({text: "js::"+args["a"]["name"]+" "+library.get("Not Found"),visibleDuration:10000});
			
		}

	}
	
	getJSONConverter(args, o) {

		var html = "";
		html += "<div class='cols' data-type='form'>";
		
			html += "<div style='width:40%'>";
				html += '<div class=\'header\'>JSON</div>';
				html += '<textarea style="height:200px">{"h":"exec","a":{"name":"text"}}</textarea>';
			html += "</div>";
			
			html += "<div style=\'width:20%;display:flex;flex-direction:column;justify-content:center\'>";
				html += "<button type='button' onclick='js.convertJSONToUrl(this)'>Convert JSON to Url --></button>";
				html += "<button type='button' onclick='js.convertUrlToJSON(this)'><-- Convert Url to JSON</button>";
			html += "</div>";
			
			html += "<div style=\'width:40%\'>";
				html += '<div class=\'header\'>Url</div>';
				html += "<textarea style='height:200px'>h=exec&a%5Bname%5D=text1</textarea>";
			html += "</div>";
			
		html += "</div>";
		
		var d = {
			"info"	:	{
				"success"	:	1
			},
			"data"	:	{
				"eHeaderAfter"	:	[
					"Construction::directly",
					"<h1>JSONConverter</h1>"
				],
				"eArticle"	:	[
					"Construction::directly",
					html
				],
			}
		};
		
		var title = document.querySelector("title").getAttribute("data-text");
		document.title = "JSONConverter | " + title;
		
		construction.lineMan(d);
	}
	
	convertJSONToUrl(o) {
		
		tools.work(1);
		
		var inText = o.closest("div").previousElementSibling.querySelector("textarea").value;
		var toTextarea = o.closest("div").nextElementSibling.querySelector("textarea");  
		
		if (inText && toTextarea) {

			//document.getElementById("jsonToUrl").value = tools.JSONtoURLEncoded(JSON.parse(inText));
			toTextarea.value = tools.transformObjToStr(JSON.parse(inText));

		}
		
		tools.work(0, undefined, 100);
		
	}
	
	convertUrlToJSON(o) {
		
		tools.work(1);
		
		var inText = o.closest("div").nextElementSibling.querySelector("textarea").value;
		var toTextarea = o.closest("div").previousElementSibling.querySelector("textarea"); 
		 
		if (inText && toTextarea) {
			
			toTextarea.value = JSON.stringify(tools.transformStrToObj(inText));

		}
		
		tools.work(0, undefined, 100);
		
	}

	setFilter(args, o) {

		var section =  null;

		if (args?.["a"]?.["section"]) {
			section = args["a"]["section"];
		}

		if (args["data"] != undefined) {

			var fields = {};
			var spec = "";

			for (var name in args["data"]) {//якщо є name
				
				if (
					name.indexOf("spec-") !== 0
					&& args["data"][name]!= ""
				) {//не починається на spec- та непусте
					spec = "";
					if (args["data"]["spec-"+name] != undefined && args["data"]["spec-"+name]) {
						spec = args["data"]["spec-"+name];
					}
					fields[name] = spec+args["data"][name];
				}
				
			}

			if (fields) {

				var strParams = null;
				var urlPlace = null;
				
				if (section === null) {
				
					strParams = document.location.pathname;
				
				} else {//є section
					
					strParams = o.closest("section").querySelector("[data-url]").value;

				}
				
				if (strParams) {
					
					strParams = strParams.split("/")[3];
					
				}

				var params = tools.transformStrToObj(strParams);

				if (params) {

					if( params["h"] != undefined) {
						
						if (params["a"]["p"] != undefined) {//видалили пагінацію
							delete params["a"]["p"];
						}
						
						
						params["a"]["filter"] = {};//формуємо фільтри з нуля

						for (var name in fields) {
							
							params["a"]["filter"][name] = fields[name];
							
						}
						
						if (section) {

							params["a"]["section"] = section;
							
						}

						if (section === null) {//головний фільтр сутності
							
							run.go(tools.transformObjToStr(params));
							
							if (args?.["a"]?.["eASideToggle"] == undefined) {
								runTools.filterToggle();
							}

						} else {

							table.go(params, o);
							
							o.closest("section").querySelector("[data-url]").value = "/p/run/"+tools.transformObjToStr(params);
						}
 
					}
					
				}
			}
		}
	}
	
	setIDToFilter(o, args) {
		
		let filterForm = o.closest(".content-inner").querySelector("aside form.groups");
		let filterElement = filterForm.querySelector(["[name='"+args["filter"]+"']"]);
		
		if (filterForm && filterElement && filterElement.value != args["value"]) {

			filterElement.value = args["value"];
			filterForm.querySelector("button.primary").click();
			runTools.filterToggle();
			//filterForm.submit();
		}

	}
	
	modifyFileGet(o) {

		let parentNode = o.parentNode;/*li*/
		
		if (parentNode.querySelector(".cols") !== null) {//є блок

			parentNode.querySelector(".cols").remove();
			o.classList.remove("bold");
			return;

		}
		
		o.classList.add("bold");
		
		let file = o.getAttribute("data-file");
		let type = o.getAttribute("data-type");
		
		let cols = element.create("div", {
			"class"	:	"cols",
			"attr"	:	{
				"style"		:	"margin:20px 0 0",
			},
		});
		
		let hljsEditor = element.create("div", {
			"class"	:	"code-hljsEditor",
			"attr"	:	{
				"contenteditable"	:	"true",
				"spellcheck"		:	"false",
				"style"				:	"border:1px solid #D8D8D8;border-radius: 0.25rem;height:50vh;padding:10px;font-family: monospace;white-space: pre-wrap;min-height:50vh;overflow-y:scroll;font-size:16px;width:100%",
			},
		});

		if (typeof hljs != "undefined") {

			hljsEditor.addEventListener('keydown', (e) => {
				if (e.key === 'Tab') {
					e.preventDefault();

					document.execCommand('insertText', false, "\t");
				}
			});
		}

		let formAction = {
			"h"	:	"exec",
			"a"	:	{
				"name"	:	"modifyFileSet",
			},
		}
		
		let formAttr = {
			"attr"	:	{
				"method"			:	"post", 
				"action"			:	tools.transformObjToStr(formAction),
				"data-first-run"	:	"setFormDynamicValid",
				"style"				:	"margin:20px 0;width:100%",
				"onsubmit"			:	"form.go(this);return false;",
			}
		};
		let form = element.create("form", formAttr);
	
		let block = element.create("div", {
			"class"	:	"block",
		});
		
		let input = element.create("input", {
			"attr"	:	{
				"type"	:	"hidden",
				"name"	:	"file",

			},
			"value"	:	file
		});
		
		let textarea = element.create("textarea", {
			"attr"	:	{
				"style"			:	"margin-top:0; padding:10px; height:50vh;",
				"name"			:	"content",
			}
		});
		
		if (typeof hljs != "undefined") {
			textarea.classList.add("dN");
		}
		runTools.enableTab(textarea);

		let submit = element.create("button", {
				"class"	:	["la", "la-24", "la-save", "h-30", "primary"],
				"attr"	:	{
					"data-action"	:	"row-save",
					"title"			:	library.get("Save"),
					"type"			:	"submit",
					"onclick"		:	"tools.submitDataForm(this)",
					"style"			:	"height:50px; padding:0 10px; margin-top:0",
				},
				"html"	:	"Зберегти CSS-файл",
			});

		block.append(input);
		block.append(textarea);
		
		form.append(block);
		form.append(submit);

		if (typeof hljs != "undefined") {
			cols.append(hljsEditor);
		}
		cols.append(form);

		parentNode.append(cols);
		
		if (typeof hljs != "undefined") {
			
			hljsEditor.addEventListener("input", () => {

				// Отримуємо текст із hljsEditor, замінюючи HTML-переноси на \n
				let text = hljsEditor.innerHTML
					.replace(/<br\s*\/?>/gi, "\n") // Замінюємо <br> на \n
					.replace(/<\/?div>/gi, "\n")   // Замінюємо <div> на \n
					.replace(/&nbsp;/gi, " ")       // Замінюємо &nbsp; на пробіл
					.replace(/<[^>]+>/g, "");       // Видаляємо інші HTML-теги

				// Очищаємо від подвійних переносів рядків, якщо потрібно
				text = text.replace(/\n\s*\n/g, "\n").trim();

				const entities = {
					"&amp;": "&",
					"&lt;": "<",
					"&gt;": ">",
					"&quot;": "\"", // Виправлено: правильна сутність для "
					"&#39;": "'",   // Виправлено: правильна сутність для '
				};

				// Ітеруємо ключі об’єкта за допомогою for...in
				for (let key in entities) {
					text = text.replaceAll(key, entities[key]); // Використовуємо replaceAll для заміни всіх входжень
				}
				
				// Передаємо текст у textarea

				textarea.value = text;
				
			});

			textarea.addEventListener('input', () => {
				hljsEditor.innerHTML = hljs.highlight(textarea.value, { language: "css"}).value;
			});

		}
		
		let args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"modifyFileGet",
			},
			p	:	{
				file	:	file
			}
			
		};
		
		tools.work(1);
		ajax.start(args).then(
		
			function(d) {
				
				d = ajax.end(d); tools.work(0);
				
				if (!d["info"]["success"]) {
					
					vNotify.error({text: "Error",visibleDuration:10000, position:"center"});
				} else {
					
					textarea.value = d["content"];
					
					if (typeof hljs != "undefined") {
						hljsEditor.innerHTML = hljs.highlight(textarea.value, {
							language	:	"css",
						}).value;
					}


				}
			}
			
		);
		

	}

}

class Exec {
	
	go(args, o, action) {

		if (exec[args["a"]["name"]] != undefined) {//можемо щось зробити на старті
			
			args = exec[args["a"]["name"]](args, o);
			
		}

		tools.work(1);
		ajax.start(args, o).then(
		
			function(d) {

				d = ajax.end(d, o);
				tools.work(0);
				
				if (d) {

					if (exec[args["a"]["name"]] != undefined) {//існує метод

						exec[args["a"]["name"]](args, o, d);

						if (d?.args?.a?.["title"]) {
							
							var header = d["args"]["a"]["title"];
							var title = document.querySelector("title").getAttribute("data-text");
							document.title = header + " | " + title;
						}
						
					} else {
						
						if (d["info"]["success"]) {

							if(d["info"]["text"] != undefined){
								vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});
							}
						} else {
							if(d["info"]["text"] != undefined){
								vNotify.error({
									text			:	d["info"]["text"],
									visibleDuration	:	10000,
									position		:	"center",
								});
							}
						}
						
						if (action != undefined) {//команда з JS

							var readyClass = Factory.create(action["class"]);
							
							if (readyClass) {
								if(readyClass[action["method"]] == undefined) {
									vNotify.error({text: "JS "+action["class"]+"::"+action["method"]+library.get("Not Found"),visibleDuration:10000});
								} else {
									readyClass[action["method"]](args, o, d);
								}
							} else {
								vNotify.error({text: "JS class:"+action["class"]+" "+library.get("Not Found"),visibleDuration:10000});
							}
						}
						
						if (d["action"] != undefined) {//команда з PHP
							
							var tmp = Object.keys(d["action"])[0].split("::");

							if (tmp[1] != undefined) {//є class та method, запускаємо, та передаємо туди об'єкт-ініціатор
								
								Factory.create(tmp[0])[tmp[1]](Object.values(d["action"])[0], o);
								
							}
							
						}
						
						if (action == undefined) {//нема команди
							
							exec["defaultAction"](args, o, d);
							
						}

					}
				}
			}
		);
	}
	
	oneZeroToggle(args, o, d) {
		
		if (d == undefined) {//підправимо аргументи на старті
			o.closest("tr").classList.add("selected");
			args["a"]["state"] = o.getAttribute("data-state");
			args["a"]["work"] = 1;
			return args;
			
		} else {
			
			if (d["info"]["success"]) {

				o.closest("tr").classList.remove("selected");
				o.setAttribute("data-state", d['stateUpdate']);

				if (d['stateUpdate'] == 1) {
					o.classList.remove("la-toggle-off");
					o.classList.add("la-toggle-on");
				} else {
					o.classList.remove("la-toggle-on");
					o.classList.add("la-toggle-off");
				}

				//table.tableRow(tr, data, args, config, args["a"]["ID"], 0, addData);
			} else {
				vNotify.error({text: d["info"]["text"],visibleDuration:10000});
			}
		}

	}
	
	radioGroupSwitcherSet(args, o, d) {
		
		if (d == undefined) {//підправимо аргументи на старті
			o.closest("tr").classList.add("selected");
			args["a"]["state"] = o.value;
			args["a"]["work"] = 1;
			return args;
			
		} else {
			
			if (d["info"]["success"]){

				o.closest("tr").classList.remove("selected");
				let i;
				let input;
				
				let labels = o.closest(".rgs").querySelectorAll("label");
				
				if (labels && labels.length) {
					for (i = 0; i < labels.length; i++) {
						input = labels[i].children;
						if (
							input[0]
						) {
							
							if (
								input[0] == o
							) {
								input[0].closest("label").classList.add("checked");

							} else {
								input[0].closest("label").classList.remove("checked");
							}

						}
						//console.log(input[0]);
					}
				}

			} else {
				vNotify.error({text: d["info"]["text"],visibleDuration:10000});
			}
		}

	}
	
	tableSetFields(args, o, d) {//множинні операції
		
		if (d == undefined) {//підправимо аргументи на старті
			
			var listIDBlock = document.querySelector("[data-id=eListID]");
			if (listIDBlock) {
				args["a"]["IDs"] = listIDBlock.querySelector("input").value.split(",");
			}
			args["a"]["work"] = 1;
			args["a"]["fields"] =  o.previousElementSibling.value;
			
			return args;
			
		} else {
			
			if(d["info"]["success"]){
				o.closest("[data-id='eHeaderAfter']").querySelector("[data-action='table-reload']").click();

			} else {
				vNotify.error({text: d["info"]["text"],visibleDuration:10000});
			}
		}

	}
	
	getFromLibrary(args, o, d) {
		
		if (d == undefined) {//підправимо аргументи на старті
			args["a"]["work"] = 1;
			return args;
			
		} else {

			if (d["info"]["success"]){

				tools.toModal ({
					"header"	:	"Help",
					"html"		:	d["data"]["value"]
				});

			} else {
				vNotify.error({text: d["info"]["text"],visibleDuration:10000});
			}
		}

	}
	
	getFromDBTableFieldComment(args, o, d) {
		
		if (d == undefined) {//підправимо аргументи на старті
			args["a"]["work"] = 1;
			return args;
			
		} else {

			if (d["info"]["success"]) {

				tools.toModal ({
					"header"	:	"Field: "+args["a"]["field"],
					"html"		:	d["data"]["value"]
				});

			} else {
				vNotify.error({text: d["info"]["text"],visibleDuration:10000});
			}
		}

	}
	
	getHelpFromTableConfig(args, o, d) {
		
		if (d == undefined) {//підправимо аргументи на старті
			args["a"]["work"] = 1;
			return args;
			
		} else {

			if (d["info"]["success"]){

				tools.toModal ({
					"header"	:	"Help",
					"html"		:	d["data"]["value"]
				});

			} else {
				vNotify.error({text: d["info"]["text"],visibleDuration:10000});
			}
		}

	}
	
	tableSortableSerialize(args, o, d) {
		
		var tableBody = document.querySelector("table[data-name='"+args["a"]["table"]+"'] > tbody");
		if (d == undefined) {//підправимо аргументи на старті
			
			args["a"]["work"] = 1;
			args["a"]["IDs"] = sortable.serialize(tableBody);
			return args;
			
		} else {

			if (d["info"]["success"]) {
				vNotify.success({text: d["info"]["text"],visibleDuration:500});
				runTools.setTableNotSortable(tableBody, o.previousElementSibling);
			} else {
				vNotify.error({text: d["info"]["text"],visibleDuration:10000});
			}
		}

	}
	
	getDBInfo(args, o, d) {
		
		if (d == undefined) {//підправимо аргументи на старті
			
			args["a"]["work"] = 1;
			return args;
			
		} else {

			if (d["info"]["success"]) {
				
				construction["lineMan"](d, o);

			} else {
				
				vNotify.error({text: d["info"]["text"],visibleDuration:10000});
				
			}
		}

	}
	
	articleStatistic(args, o, d) {
		
		if (d == undefined) {//підправимо аргументи на старті
			
			args["a"]["work"] = 1;
			return args;
			
		} else {

			if(d["info"]["success"]) {
				construction["lineMan"](d, o);

			} else {
				vNotify.error({text: d["info"]["text"],visibleDuration:10000});
			}
		}

	}
	
	defaultAction(args, o, d) {

		if (d?.args?.a?.["title"]) {
			
			var header = d["args"]["a"]["title"];
			var title = document.querySelector("title").getAttribute("data-text");
			document.title = header + " | " + title;
		}

		if (d["info"]["success"]) {
			
			if (d["data"]!= undefined) {
				construction["lineMan"](d, o);
			}
			
		}
		
	}
}

class Sortable {
	
	/*https://codepen.io/fitri/pen/VbrZQm*/
	elem = null;//тільки один елемент може керуватись (?)
	sortableParent = null;
	
	enableDragSort(sortableParent) {
		sortable.enableDragList(sortableParent);
		sortable.sortableParent = sortableParent;
	}
	
	enableDragList(list) {
		Array.prototype.map.call(list.children, (item) => {sortable.enableDragItem(item)});
	}

	enableDragItem(item) {

		item.setAttribute("draggable", true);
		
		item.ondrag = sortable.handleDrag; item.ondragover = sortable.handleOver; item.ondragend = sortable.handleDrop;
		item.ontouchstart = sortable.handleDrag; item.ontouchmove = sortable.handleOver; item.ontouchend = sortable.handleDrop;

	}

	handleDrag() {
		event.target.classList.add("active");
		sortable.elem = event.target;
		//tools.consoleLog(event.target, "[data-id='eArticleBefore']");
	}

	handleOver() {
		if(sortable.elem !== null && sortable.sortableParent !== null){
			var allChildren = [];
			var allChildrenPre = sortable.sortableParent.children;
			if(allChildrenPre){
				if(sortable.sortableParent.tagName == "TBODY"){//тоді відбираємо тільки TR (баг DOM чи шо);
					for (var i = 0; i < allChildrenPre.length; i++) {
						if(allChildrenPre[i].tagName != "TR"){
							allChildrenPre[i].remove();
						}
					}
				}
			}
			
			allChildren = Array.from(allChildrenPre);
			
			var overElem = null;
			var path = event.composedPath();
			for(var i = 0; i < path.length; i++){
				if(path[i] === sortable.sortableParent){
					overElem = path[(i-1)];
					break;
				}
			}
			if(allChildren.indexOf(overElem) > allChildren.indexOf(sortable.elem) && allChildren.indexOf(sortable.elem) !== -1){
				overElem.after(sortable.elem);
			} else {
				overElem.before(sortable.elem);
			}
		}
	}
	
	handleDrop() {
		sortable.elem = null;
		event.target.classList.remove("active");
	}

	disableDragSort(sortableParent) {
		sortable.elem = null;
		sortable.sortableParent = null;
		sortable.disableDragList(sortableParent);
	}

	disableDragList(list) {
		Array.prototype.map.call(list.children, (item) => {sortable.disableDragItem(item)});
	}
	
	disableDragItem(item) {
		item.removeAttribute("draggable");
		item.ondrag = item.ondragover = item.ondragend = null;
		item.ontouchstart = item.ontouchmove = item.ontouchend = null;
	}
	
	serialize(sortableParent) {
		
		var data = [];
		for (var i = 0; i < sortableParent.children.length; i++) {
			data[i] = sortableParent.children[i].getAttribute("data-id");
		}
		return data;
		
	}
	
	make(sortableParent, o) {
		
		var state = parseInt(o.getAttribute("data-state"));
		if(!state) {// вимкнено - вмикаємо
			sortableParent.classList.add("sortable");
			o.classList.add("secondary");
			o.nextElementSibling.classList.remove("displayNone");
			o.nextElementSibling.classList.add("primary");
			o.setAttribute("data-state", 1);
			sortable.enableDragSort(sortableParent);
		} else {//вимикаємо
			sortable.deMake(sortableParent, o);
		}
	}
	
	deMake(sortableParent, o) {
		
		sortableParent.classList.remove("sortable");
		o.classList.remove("secondary");
		o.nextElementSibling.classList.add("displayNone");
		o.nextElementSibling.classList.remove("primary");
		o.setAttribute("data-state", 0);
		sortable.disableDragSort(sortableParent);
		
	}

}

class Cell {

	edit(td) {

		td.classList.add("action");
		//td.classList.remove("edited");
		td.removeAttribute("onclick");
		
		td.setAttribute("data-title", td.getAttribute("title"));
		td.removeAttribute("title");
		
		//console.log(td.innerHTML);
		td.setAttribute("data-content", td.innerHTML);

		
		var p = {
			field	:	td.getAttribute("data-field"),
			table	:	td.closest("table").getAttribute("data-name"),
			ID		:	td.closest("tr").getAttribute("data-id"),
		};

		//td.removeEventListener("click", table.callbackColsEdited(p["field"]));
		
		var args = {
			h	:	"exec",
			a	:	{
				"name"	:	"getCellEditData",//method
				"p"		:	p,
				"work"	:	1
			}
		};
		
		ajax.start(args).then(
		
			function(d) {
				
				d = ajax.end(d);
				
				if (d["info"]["success"]) {

					while (td.firstChild) {//видаляємі всі дочірні елементи
						
						td.removeChild(td.firstChild);
						
					}
					
					var formAction = {
						"h"	:	"exec",
						"a"	:	{
							"name"	:	"cellEditSave",//method
							"p"		:	p,
						},
					}
					
					var formTag = "div";
					
					var formAttr = {
						"class"	:	"groups",
						"attr"	:	{
							"data-type"			:	"form",
							"data-action"		:	tools.transformObjToStr(formAction),
							"data-first-run"	:	"setFormDynamicValid",
							//"style"			:	"max-width:"+ td.offsetWidth+"px"
						}
					};
					
					var groups = element.create(formTag, formAttr);

					var blockElementAttr = {};

					if (d["control"]?.["blockElement"]) {
						
						blockElementAttr = d["control"]["blockElement"];
					
					}

					blockElementAttr["class"] = "block";
					var block = element.create("div", blockElementAttr);
					
					var tagElementAttr = {};
					
					if (d?.["control"]?.["element"]) {
						
						tagElementAttr = d["control"]["element"];
						
					}

					if (tagElementAttr["attr"] == undefined) {
						
						tagElementAttr["attr"] = {};
						
					}

					tagElementAttr["attr"]["data-name"] = p["field"];
					
					if (d["control"]?.["element"]?.["tag"] && d["control"]["element"]["tag"] == "select") {
						
						if (d["control"]["element"]["option"] == undefined) {
							
							console.log("select need element.option");
							
						} else {//є метод для встановлення option
			
							if (typeof runTools[Object.keys(d["control"]["element"]["option"])[0]] == "function") {
								
								tagElementAttr["option"] = runTools[Object.keys(d["control"]["element"]["option"])[0]](
									Object.values(d["control"]["element"]["option"])[0], 
									d["addData"] 
								);

							}
						}
					}

					/*if (d["control"]["element"]["tag"] == "input") {//замінюємо на textarea, щоб не спрацювував, як submit форми
						
						d["control"]["element"]["tag"] = "textarea";
						
						if (tagElementAttr?.["attr"]?.["style"]) {// забороняємо ресайзінг
							
							tagElementAttr["attr"]["style"] += ";resize:none";
							
						} else {
							
							tagElementAttr["attr"]["style"] = "resize:none";
							
						}
						
					}*/
					
					var input = null;

					if (d["control"]?.["element"]?.["tag"]) {
						
						//console.log(tagElementAttr["default"]);return false;
						input = element.create(d["control"]["element"]["tag"], tagElementAttr);

						/*if (tagElementAttr?.["attr"]?.["data-reaction"]) {
							
							input.addEventListener("input", function (e){reaction.go(e);});
						
						}*/
						
						if(tagElementAttr?.["attr"]?.["type"] && tagElementAttr["attr"]["type"] == "checkbox") {
							
							if (d["value"] == 1) {
								
								input.checked = true;
								
							}

						} else {
							
							if (tagElementAttr?.["multiple"]) {//select multiple
								
								var tmp = d["value"].split(",");
								var tmp2;
								
								if (input.querySelector("option[value='']")) {
									
									input.querySelector("option[value='']").selected = false;
									
								}

								for (var i = 0; i < tmp.length; i++) {

									if (tmp[i]) {
										
										tmp2 = input.querySelector("option[value='"+tmp[i]+"']");
										
										if (tmp2) {
											
											input.querySelector("option[value='"+tmp[i]+"']").selected = true;
											
										}
									}
								}
							} else {
								if (input.tagName == "SELECT") {
									input.focus();
								}
								input.value = d["value"];

							}
						}

					}
					

					groups.append(block);
					
					var toolbar = element.create("div", {"class" : ["toolbar", "fr"]});

					/*var saveBtn = element.create("button",{
						"class"	:	["la", "la-16", "la-save", "h-24"],
						"attr"	:	{
							"title"	:	library.get("Cell Save"),
							"type"		:	"button",
							"onclick"	:	"tools.submitDataForm(this)"
						}
					});*/
					var saveCloseBtn = element.create("button",{
						"class"	:	["la", "la-24", "la-save", "h-30"],
						"attr"	:	{
							"title"	:	library.get("Cell Save & Close"),
							"type"			:	"button",
							"data-action"	:	"save-close",
							"onclick"		:	"tools.submitDataForm(this)",
						}
					});
					var closeBtn = element.create("button",{
						
						"class"	:	["la", "la-24", "la-close", "h-30"],
						"attr"	:	{
							"title"	:	library.get("Close"),
							"type"		:	"button",
							"onclick"	:	"cell.editCancel(this)",
						}
					});
					

					//toolbar.append(saveBtn);
					toolbar.append(saveCloseBtn);
					toolbar.append(closeBtn);
					
					groups.append(toolbar);
					
					td.append(groups);
					
					if (input) {
						
						td.offsetWidth
						block.append(input);
						
						if (tagElementAttr?.["attr"]?.["data-addon"]) {
							
							switch (tagElementAttr["attr"]["data-addon"]) {
								
								case "slim":

									if (tagElementAttr["multiple"] != undefined) {
										
										var select = new SlimSelect({
											select			:	input,
											closeOnSelect	: false
										});
										
									} else {
										
										var select = new SlimSelect({
											select	:	input,
										});
										
									}
								break;
							}
						}
						
						if (tagElementAttr?.["attr"]?.["data-reaction"]) {
							
							input.addEventListener("input", function (e){reaction.go(e["srcElement"]);});
							input.addEventListener("focus", function (e){reaction.go(e["srcElement"]);});
						
						}
						
						if (input.tagName == "SELECT") {
							
							input.focus();
							
						} else {
							
							input.select();
							
							if (input.tagName == "INPUT") {
								
								input.addEventListener("keypress", function() {
									
									if (event.keyCode == 13) {//на ентер 
										
										event.preventDefault();//відмінили відправку головної форми
										
										saveCloseBtn.click();
											
									}
									
								});

							}
							
						}
					}
					
				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);

	}
	
	editCancel(o) {
		
		var td = o.closest("td");
		
		while (td.firstChild) {//видаляємо всі дочірні елементи
			
			td.removeChild(td.firstChild);
			
		}
		
		td.classList.remove("action");
		
		td.innerHTML = td.getAttribute("data-content");
		td.removeAttribute("data-content");
		
		td.setAttribute("title", td.getAttribute("data-title"));
		td.removeAttribute("data-title");
		
		td.setAttribute("ondblclick", "cell.edit(this)");
		
	}
	
	reloadTrAfterEdit(p) {
		
		if (p?.["table"] && p?.["ID"]) {
			
			var reloadRowBtn = document.querySelector("table[data-name='"+p["table"]+"'] tr[data-id='"+p["ID"]+"'] td button[data-action='tr-reload']");
			
			if (reloadRowBtn) {
				reloadRowBtn.click();
			}

		}
	}
}

class Editor {

	go(p) {

		let selection = editor.getSelection();

		if (selection === null) {
			return false;
		}

		switch (p[0]) {
			case "<ol>":
				editor.list(selection, p);
			break;
			case "<ul>":
				editor.list(selection, p);
			break;
			case "<p>":
				editor.wrap(selection, p);
			break;
			case "<strong>":
				editor.wrap(selection, p);
			break;
			case "<em>":
				editor.wrap(selection, p);
			break;
			case "<br>":
				editor.wrap(selection, p);
			break;
			case "<h2>":
				editor.wrap(selection, p);
			break;
			case "<h3>":
				editor.wrap(selection, p);
			break;
		}
		
	}

	getSelection() {
		
		let r = null;
		let selection = window.getSelection();

		if (selection.anchorNode !== null) {
			
			var selectionNode = selection.anchorNode.childNodes[selection.anchorOffset];
			
			if (selectionNode && selectionNode.tagName == "TEXTAREA") {
				r = {
					node	:	selectionNode,
					s		:	{
						len		:	selectionNode.value.length,
						start	:	selectionNode.selectionStart,
						end		:	selectionNode.selectionEnd,
						sel		:	selectionNode.value.substring(selectionNode.selectionStart, selectionNode.selectionEnd)
					}
				};
			}
		}
		if (r === null) {
			
			vNotify.error({text: library.get("Select Textarea")});
			
		}
		
		return r;
	}
	
	modifySelection(selection, replaced) {
		
		selection["node"].value = selection["node"].value.substring(0,selection["s"]["start"]) + replaced + selection["node"].value.substring(selection["s"]["end"],selection["s"]["len"]);
		
	}
	
	list(selection, p) {
		
		if (selection?.["s"]?.["sel"]) {
			let list = selection["s"]["sel"].split('\n');
			for (let i=0; i<list.length; i++) {
				list[i] = '\t<li>' + list[i] + '</li>';
			}
		
			let replaced = p[0] + '\n' + list.join("\n") + '\n' +p[1];
			editor.modifySelection(selection, replaced);
				
		}

	}
	
	wrap(selection, p) {

		let replaced = p[0] + selection["s"]["sel"] + p[1];
		editor.modifySelection(selection, replaced);
		
	}
	
	clone(selection) {

		if (selection == undefined) {
			selection = editor.getSelection();
		}

		
		if (selection === null) {
			return false;
		}
		
		let replaced = selection["s"]["sel"] + "\n" + selection["s"]["sel"];
		editor.modifySelection(selection, replaced);
		
	}

	url(selection, p) {
		
		if (selection === null) {
			return false;
		}

		var replaced = "<a href=\""+selection["s"]["sel"]+"\" target=\"_blank\">"+selection["s"]["sel"]+"</a>";
		
		editor.modifySelection(selection, replaced);
		
	}
	
	removeTags(selection) {
		
		if (selection === null) {
			return false;
		}

		if (selection["node"].value) {
			
			selection["node"].value = selection["node"].value.replace(/(<([^>]+)>)/ig,"");
			
		}
	}
}

class ItemTools {
	
	categoryByPropertyToolbar(config, block) {

		while (block.firstChild) {//видаляємо всі дочірні елементи
			
			block.removeChild(block.firstChild);
			
		}
		
		let ID = parseInt(config["ID"]);
		let table = config["table"];
		let propertySetCategoryID = config["propertySetCategoryID"];
		
		if (!isNaN(ID)) {//при редагуванні

			var args = {
				h	:	"exec",
				a	:	{
					"name"	:		"categoryByPropertyToolbarGet",
				},
				p	:	{
					"propertySetCategoryID"	:	propertySetCategoryID,
					"parent"				:	ID,
					"table"					:	table,
				},
			};

			tools.work(1);
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d); tools.work(0);
					
					if (d["info"]["success"]) {

						var line = element.create("div", {
							"class"	:	"line",
						});
						
						var toolbarLeft = element.create("div", {
							"class"	:	"toolbar",
						});
						
						var reloadButton = element.create("button", {
							
							"class"	:	["la", "la-24", "la-refresh", "h-40"],
							"attr"	:	{
								"type":			"button",
								"title":		library.get("Reload") + " " + library.get("CategoryByProperty"),
								"data-action":	"categoryByProperty-toolbar-reload",
							}
							
						});
						
						var callbackF = function(p1, p2) {
							
							return function() {
								
								itemTools.categoryByPropertyToolbar(p1, p2);
								
							};
							
						};
						
						reloadButton.addEventListener("click", callbackF(config, block));
						toolbarLeft.append(reloadButton);

						var groupsForm = element.create("div", {
							"class"	:	"groups",
							"attr"	:	{
								"data-type"		:	"form",
								"data-checkbox"	:	"checkedOnly",
							}
						});
						
						groupsForm.append(line);
						
						groupsForm.append(element.create("input", {"attr":{"type":"hidden","data-name":"table"},"value":table}));
						groupsForm.append(element.create("input", {"attr":{"type":"hidden","data-name":"parent"},"value":ID}));

						if (d?.["permission"] && d["permission"] == "1111") {//повинні бути права на все
							
							var saveButton = element.create("button", {
								
								"class"	:	["la", "la-24", "la-save", "h-40"],
								"attr"	:	{
									"type":			"button",
									"title":		library.get("Save") + " " + library.get("Options"),
									"data-action":	"property-toolbar-save",
									"onclick"	:	"itemTools.categoryByPropertyToolbarSaveBtn(this)"
								}
								
							});
							
							toolbarLeft.append(saveButton);
							
						}
						
						toolbarLeft.append(element.create("div", {
							"class"	:	["bg-pink", "disabled", "h-40"], 
							"html"	:	library.get("Categories"),
							"attr"	:	{
								"data-action"	:	"info",
							}
						}));
						
						if (d["count"] == undefined) {
							d["count"] = 0;
						}
						
						var count = d["count"];
						
						toolbarLeft.append(element.create("div",{
							
							"class"	:	"count",
							"html"	:	count
							
						}));
						
						line.prepend(toolbarLeft);
						
						block.append(groupsForm);
						
						var treeElem = element.create("div",{
							
							"html"	:	d["tree"],
							"attr"	:	{
								"style"	:	"margin:10px 0;max-height:max-content;background-color:#f8f8f8;padding:10px 10px 0",
							},
							
						});
						
						groupsForm.append(treeElem);
						
						//groupsForm.append(line.cloneNode(true));
						
						trees.view(treeElem);
						trees.checkData(treeElem, d["data"], ID);
						trees.setAll(treeElem);
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
			
			);
			
		}
	}

	categoryByPropertyToolbarSaveBtn (o) {
		/*знайти і передати дані форми в метод*/
		var formO = o.closest("[data-type='form']");
		
		itemTools.categoryByPropertyToolbarSave(form.returnData(formO), formO);
		
	}

	categoryByPropertyToolbarSave(data, formO) {

		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"categoryByPropertyToolbarSave",
			},
			data	:	data,
		};

		tools.work(1);
		ajax.start(args, formO).then(
		
			function(d) {
				
				d = ajax.end(d, formO); tools.work(0);
				
				if(d["info"]["success"]) {//успішно
					
					vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
					
				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);
	}
	
}
/*Factory Registered classes*/

Factory.register("Run", Run); run = Factory.create("Run");
Factory.register("Table", Table); table = Factory.create("Table");
Factory.register("Report", Report); report = Factory.create("Report");
Factory.register("Construction", Construction); construction = Factory.create("Construction");
Factory.register("Element", Element); element = Factory.create("Element");
Factory.register("Table", Table); table = Factory.create("Table");
Factory.register("Row", Row); row = Factory.create("Row");
Factory.register("Cell", Cell); cell = Factory.create("Cell");
Factory.register("TableModify", TableModify); tableModify = Factory.create("TableModify");
Factory.register("RunTools", RunTools); runTools = Factory.create("RunTools");
Factory.register("Filter", Filter); filter = Factory.create("Filter");
Factory.register("Js", Js); js = Factory.create("Js");
Factory.register("Exec", Exec); exec = Factory.create("Exec");
Factory.register("Sortable", Sortable); sortable = Factory.create("Sortable");
Factory.register("Editor", Editor); editor = Factory.create("Editor");
Factory.register("ItemTools", ItemTools); itemTools = Factory.create("ItemTools");

/*\Factory Registered classes*/
class EDToolbar {
	
	start(config) {
		
		var line = element.create("div", {
			class	:	["line", "ed"]
		});
		
		if (config && config.length) {
			
			for (var i = 0; i < config.length; i++) {
				
				if (config[i] in edToolbar) {
					
					line.append(edToolbar[config[i]]());
				
				} else {
					
					console.log("EdToolbar::"+config[i]+" does not exist");
				
				}
			}
		}
		
		return line;
	}

	createButtons(toolbar, setting) {
		
		var btn, params, callbackF;
		
		for (var i = 0; i < setting.length; i++) {
			
			params = {
				"attr"	:	{
					"type"	:	"button"
				}
			};
			
			if (setting[i]["title"] != undefined){
				
				params["attr"]["title"] = setting[i]["title"];
				
			}
			if (setting[i]["style"] != undefined){
				
				params["attr"]["style"] = setting[i]["style"];
				
			}
			
			if (setting[i]["html"] != undefined) {
				
				params["html"] = setting[i]["html"];
				
			}
			
			/*params["class"] = ["la", "la-24", "h-40"];*/
			params["class"] = ["la"];
			
			if (setting[i]["class"] != undefined) {
				
				if (Array.isArray(setting[i]["class"])) {
					
					params["class"] = setting[i]["class"];
					
				} else {
				
					params["class"].push(setting[i]["class"]);
				
				}
				
			}

			btn = element.create("button", params);
			
			if (setting[i]["onclick"] != undefined) {
				
				btn.setAttribute("onclick", setting[i]["onclick"]);
			
			} else {

				callbackF = function(m, p) {

					return function() {

						if (editor?.[m]) {

							editor[m](editor.getSelection(), p);
						
						}

					};
				};

				btn.addEventListener("click", callbackF(setting[i]["method"], setting[i]["params"]));
				
			}

			toolbar.append(btn);

		}
	}
	
	rowToolbarTags() {
		
		let setting = [
			{
				"class"		:	"la-paragraph",
				"method"	:	"wrap",
				"params"	:	["<p>", "</p>"],
				"title"		:	"<p></p> [Alt+P]",
			},
			{
				"class"		:	"la-bold",
				"method"	:	"wrap",
				"params"	:	["<strong>", "</strong>"],
				"title"		:	"<strong></strong> [Alt+B]",
			},
			{
				"class"		:	"la-italic",
				"method"	:	"wrap",
				"params"	:	["<em>", "</em>"],
				"title"		:	"<em></em> [Alt+I]",
			},
			{
				"html"		:	"H2",
				"method"	:	"wrap",
				"params"	:	["<h2>", "</h2>"],
				"title"		:	"<h2></h2> [Alt+2]",
			},
			{
				"html"		:	"H3",
				"method"	:	"wrap",
				"params"	:	["<h3>", "</h3>"],
				"title"		:	"<h3></h3> [Alt+3]",
			},
			{
				"class"		:	"la-list-ul",
				"method"	:	"list",
				"params"	:	["<ul>", "</ul>"],
				"title"		:	"<ul></ul> [Alt+U]",
			},
			{
				"class"		:	"la-list-ol",
				"method"	:	"list",
				"params"	:	["<ol>", "</ol>"],
				"title"		:	"<ol></ol> [Alt+O]",
			},
			{
				"class"		:	"la-link",
				"method"	:	"url",
				"title"		:	library.get("Link"),
			},
/*			{
				"class"		:	"la-clone",
				"method"	:	"clone",
				"title"		:	library.get("Clone Selected"),
			},
			{
				"class"		:	"la-columns",
				"method"	:	"wrap",
				"params"	:	["\t<div class=\"cols\">\n\t\t<div>1</div>\n\t\t<div>2</div>", "\n\t</div>"],
				"title"		:	library.get("Cols"),
			},*/
			{
				"html"		:	"br",
				"method"	:	"wrap",
				"params"	:	["<br>", ""],
				"title"		:	"<br>",
			},
/*			{
				"html"		:	"span",
				"method"	:	"wrap",
				"params"	:	["<span>", "</span>"],
				"title"		:	"<span></span>",
			},*/
			{
				"html"		:	"«»",
				"method"	:	"wrap",
				"params"	:	["«", "»"],
				"title"		:	"«»",
			},
			{
				"html"		:	"—",
				"method"	:	"wrap",
				"params"	:	["—", ""],
				"title"		:	"—",
			},
/*			{
				"html"		:	"&lt;!--*--&gt;",
				"method"	:	"wrapSelection",
				"params"	:	["<!--", "-->"],
				"title"		:	"Comment",
			},*/
		];
		
		let toolbar = element.create("div", {"class":["toolbar", "wrap"]});
		edToolbar["createButtons"](toolbar, setting);
		
		return toolbar;
	}

	rowToolbarMacro() {
		
		var setting = [
			{
				"class"		:	"la-table",
				"method"	:	"doTable",
				"title"		:	library.get("Table"),
			},
			{
				"html"		:	"Tabs",
				"method"	:	"macroTabs",
				"title"		:	library.get("Tabs"),
			},
			{
				"class"		:	"la-book-open",
				"method"	:	"macroLibrary",
				"title"		:	library.get("Macro Library"),
			},
			{
				"class"		:	"la-link",
				"method"	:	"macroLink",
				"title"		:	library.get("Macro Link"),
			},
		];

		var toolbar = element.create("div", {"class" : ["toolbar", "wrap"]});
		
		var callbackF = function(m,p) {
			return function() {
				edToolbar[m](p);
			};
		};
		
		var cols = element.create("select");
		cols.addEventListener("change", callbackF("macroCols", cols));
		
		var option = element.create("option",{html : "cols", value : ""});
		cols.append(option);
		for (var i = 2; i <= 6; i++){
			option = element.create("option",{html : i, value : i});
			cols.append(option);
		}
		
		toolbar.append(cols);
		
		edToolbar.createButtons(toolbar, setting);
		
		return toolbar;
	}

	rowToolbarEngine() {
		
		var setting = [
			/*{

				"html"		:	"+T",
				"method"	:	"doAutoAddTags",
				"title"		:	library.get("Auto Add Tags"),
			},*/
			{
				"html"		:	"x&lt;&gt;",
				"method"	:	"removeTags",
				"title"		:	library.get("Remove Tags"),
			},
			/*{
				"html"		:	"x&lt;attr&gt;",
				"method"	:	"doRemoveTagsAttr",
				"title"		:	"Remove Tags Attr",
			},*/

		];
		var toolbar = element.create("div", {"class" : ["toolbar", "wrap"]});
		edToolbar["createButtons"](toolbar, setting);
		return toolbar;
	}

	rowToolbarCurrent() {//заглушка
		return "";
	}
	
	doTable(){
		var selection = edToolbar.getSelectionTextarea();
		if(selection !== null){
			var rep = "<div class=\"table-wr\"><table><tbody>";
			rep += "\n\t<tr>";
			rep += "\n\t\t<td></td>";
			rep += "\n\t\t<td></td>";
			rep += "\n\t</tr>";
			rep += "\n</tbody></table></div>";
			edToolbar.modifySelectionTextarea(selection, rep);
		}
	}

	macroTabs(){
		var selection = edToolbar.getSelectionTextarea();
		if(selection !== null){
			var rep = "[tabs]";
			rep += "\n\t[tab header=\"header1\"]text1[/tab]";
			rep += "\n\t[tab header=\"header2\"]text2[/tab]";
			rep += "\n[/tabs]";
			edToolbar.modifySelectionTextarea(selection, rep);
		}
	}
	
	macroCols(select) {
		if(select.value){
			var selection = edToolbar.getSelectionTextarea();
			if(selection !== null){
				var rep = "<div class=\"cols col"+select.value+"\">";
				for (var i = 1; i <= select.value; i++){
					rep += "\n\t<div>" + i + "</div>";
				}
				rep += "\n</div>";
				edToolbar.modifySelectionTextarea(selection, rep);
			}
		}
	}
	

	
	macroLibrary(){
		var selection = edToolbar.getSelectionTextarea();
		if(selection !== null){
			var rep = "[library name=\""+selection["s"]["sel"]+"\"/]";
			edToolbar.modifySelectionTextarea(selection, rep);
		}
	}
	
	macroLink() {
		var selection = edToolbar.getSelectionTextarea();
		if(selection !== null){
			var rep = "[link ID=\""+selection["s"]["sel"]+"\"/]";
			edToolbar.modifySelectionTextarea(selection, rep);
		}
	}
	

	doRemoveTagsAttr() {
		
		var selection = edToolbar.getSelectionTextarea();
		
		if (selection !== null && selection["node"].value) {
			
			vNotify.error({text: "Not Work",visibleDuration:500});
			//selection["node"].value = selection["node"].value.replace(/(<[a-z]).*?(>)/ig,"");
			
		}
	}
	
	doRemoveTagsAttr() {
		
		var selection = edToolbar.getSelectionTextarea();
		
		if (selection !== null && selection["node"].value) {
			
			vNotify.error({text: "Not Work",visibleDuration:500});
			//selection["node"].value = selection["node"].value.replace(/(<[a-z]).*?(>)/ig,"");
			
		}
	}
	
	/*doAutoAddTags() {
		
		var selection = edToolbar.getSelectionTextarea();
		
		if (selection !== null && selection["node"].value) {
			
			exec.parsedown(
				{
					value	:	selection["node"].value
				}, 
				selection["node"]
			);
			
		} else {
			
			vNotify.error({text: "Text Empty",visibleDuration:5000});
		
		}
	}*/
	
	modifySelectionTextarea(selection, rep) {
		
		selection["node"].value = selection["node"].value.substring(0,selection["s"]["start"]) + rep + selection["node"].value.substring(selection["s"]["end"],selection["s"]["len"]);
		
	}
	
	getSelectionTextarea() {
		
		var r = null;
		var selection = window.getSelection();

		if (selection.anchorNode !== null) {
			
			var selectionNode = selection.anchorNode.childNodes[selection.anchorOffset];
			
			if (selectionNode && selectionNode.tagName == "TEXTAREA") {
				r = {
					node	:	selectionNode,
					s		:	{
						len		:	selectionNode.value.length,
						start	:	selectionNode.selectionStart,
						end		:	selectionNode.selectionEnd,
						sel		:	selectionNode.value.substring(selectionNode.selectionStart, selectionNode.selectionEnd)
					}
				};
			}
		}
		if (r === null) {
			
			vNotify.error({text: library.get("Select Textarea")});
			
		}
		
		return r;
	}
}

Factory.register("EDToolbar", EDToolbar); edToolbar = Factory.create("EDToolbar");
/**
 * http://www.openjs.com/scripts/events/keyboard_shortcuts/
 * Version : 2.01.B
 * By Binny V A
 * License : BSD
 */
shortcut = {
	'all_shortcuts':{},//All the shortcuts are stored in this array
	'add': function(shortcut_combination,callback,opt) {
		//Provide a set of default options
		var default_options = {
			'type':'keydown',
			'propagate':false,
			'disable_in_input':false,
			'target':document,
			'keycode':false
		}
		if(!opt) opt = default_options;
		else {
			for(var dfo in default_options) {
				if(typeof opt[dfo] == 'undefined') opt[dfo] = default_options[dfo];
			}
		}

		var ele = opt.target;
		if(typeof opt.target == 'string') ele = document.getElementById(opt.target);
		var ths = this;
		shortcut_combination = shortcut_combination.toLowerCase();

		//The function to be called at keypress
		var func = function(e) {
			var code = null;
			e = e || window.event;
			
			if(opt['disable_in_input']) { //Don't enable shortcut keys in Input, Textarea fields
				var element;
				if(e.target) element=e.target;
				else if(e.srcElement) element=e.srcElement;
				if(element.nodeType==3) element=element.parentNode;

				if(element.tagName == 'INPUT' || element.tagName == 'TEXTAREA') return;
			}
	
			//Find Which key is pressed
			if (e.keyCode) code = e.keyCode;
			else if (e.which) code = e.which;
			//var character = String.fromCharCode(code).toLowerCase();
			var character = null;
			if(typeof(code) != "undefined")
			{
				character = String.fromCharCode(code).toLowerCase();
			}
			if(typeof(code) != undefined)
			{
				if(code == 188) character=","; //If the user presses , when the type is onkeydown
				if(code == 190) character="."; //If the user presses , when the type is onkeydown			
			}

			var keys = shortcut_combination.split("+");
			//Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
			var kp = 0;
			
			//Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
			var shift_nums = {
				"`":"~",
				"1":"!",
				"2":"@",
				"3":"#",
				"4":"$",
				"5":"%",
				"6":"^",
				"7":"&",
				"8":"*",
				"9":"(",
				"0":")",
				"-":"_",
				"=":"+",
				";":":",
				"'":"\"",
				",":"<",
				".":">",
				"/":"?",
				"\\":"|"
			}
			//Special Keys - and their codes
			var special_keys = {
				'esc':27,
				'escape':27,
				'tab':9,
				'space':32,
				'return':13,
				'enter':13,
				'backspace':8,
	
				'scrolllock':145,
				'scroll_lock':145,
				'scroll':145,
				'capslock':20,
				'caps_lock':20,
				'caps':20,
				'numlock':144,
				'num_lock':144,
				'num':144,
				
				'pause':19,
				'break':19,
				
				'insert':45,
				'home':36,
				'delete':46,
				'end':35,
				
				'pageup':33,
				'page_up':33,
				'pu':33,
	
				'pagedown':34,
				'page_down':34,
				'pd':34,
	
				'left':37,
				'up':38,
				'right':39,
				'down':40,
	
				'f1':112,
				'f2':113,
				'f3':114,
				'f4':115,
				'f5':116,
				'f6':117,
				'f7':118,
				'f8':119,
				'f9':120,
				'f10':121,
				'f11':122,
				'f12':123
			}
	
			var modifiers = { 
				shift: { wanted:false, pressed:false},
				ctrl : { wanted:false, pressed:false},
				alt  : { wanted:false, pressed:false},
				meta : { wanted:false, pressed:false}	//Meta is Mac specific
			};
                        
			if(e.ctrlKey)	modifiers.ctrl.pressed = true;
			if(e.shiftKey)	modifiers.shift.pressed = true;
			if(e.altKey)	modifiers.alt.pressed = true;
			if(e.metaKey)   modifiers.meta.pressed = true;
                        
			for(var i=0; k=keys[i],i<keys.length; i++) {
				//Modifiers
				if(k == 'ctrl' || k == 'control') {
					kp++;
					modifiers.ctrl.wanted = true;

				} else if(k == 'shift') {
					kp++;
					modifiers.shift.wanted = true;

				} else if(k == 'alt') {
					kp++;
					modifiers.alt.wanted = true;
				} else if(k == 'meta') {
					kp++;
					modifiers.meta.wanted = true;
				} else if(k.length > 1) { //If it is a special key
					if(special_keys[k] == code) kp++;
					
				} else if(opt['keycode']) {
					if(opt['keycode'] == code) kp++;

				} else { //The special keys did not match
					if(character == k) kp++;
					else {
						if(shift_nums[character] && e.shiftKey) { //Stupid Shift key bug created by using lowercase
							character = shift_nums[character]; 
							if(character == k) kp++;
						}
					}
				}
			}
			
			if(kp == keys.length && 
						modifiers.ctrl.pressed == modifiers.ctrl.wanted &&
						modifiers.shift.pressed == modifiers.shift.wanted &&
						modifiers.alt.pressed == modifiers.alt.wanted &&
						modifiers.meta.pressed == modifiers.meta.wanted) {
				callback(e);
	
				if(!opt['propagate']) { //Stop the event
					//e.cancelBubble is supported by IE - this will kill the bubbling process.
					e.cancelBubble = true;
					e.returnValue = false;
	
					//e.stopPropagation works in Firefox.
					if (e.stopPropagation) {
						e.stopPropagation();
						e.preventDefault();
					}
					return false;
				}
			}
		}
		this.all_shortcuts[shortcut_combination] = {
			'callback':func, 
			'target':ele, 
			'event': opt['type']
		};
		//Attach the function with the event
		if(ele.addEventListener) ele.addEventListener(opt['type'], func, false);
		else if(ele.attachEvent) ele.attachEvent('on'+opt['type'], func);
		else ele['on'+opt['type']] = func;
	},

	//Remove the shortcut - just specify the shortcut and I will remove the binding
	'remove':function(shortcut_combination) {
		shortcut_combination = shortcut_combination.toLowerCase();
		var binding = this.all_shortcuts[shortcut_combination];
		delete(this.all_shortcuts[shortcut_combination])
		if(!binding) return;
		var type = binding['event'];
		var ele = binding['target'];
		var callback = binding['callback'];

		if(ele.detachEvent) ele.detachEvent('on'+type, callback);
		else if(ele.removeEventListener) ele.removeEventListener(type, callback, false);
		else ele['on'+type] = false;
	}
};
/**
 * sortable 1.5 (or something, I always forget to update this)
 *
 * Makes html tables sortable, ie9+
 *
 * Styling is done in css.
 *
 * Copyleft 2017 Jonas Earendel
 *
 * This is free and unencumbered software released into the public domain.
 *
 * Anyone is free to copy, modify, publish, use, compile, sell, or
 * distribute this software, either in source code form or as a compiled
 * binary, for any purpose, commercial or non-commercial, and by any
 * means.
 *
 * In jurisdictions that recognize copyright laws, the author or authors
 * of this software dedicate any and all copyright interest in the
 * software to the public domain. We make this dedication for the benefit
 * of the public at large and to the detriment of our heirs and
 * successors. We intend this dedication to be an overt act of
 * relinquishment in perpetuity of all present and future rights to this
 * software under copyright law.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 * OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 * For more information, please refer to <http://unlicense.org>
 *
 */

// sort is super fast, even with huge tables, so that is probably not the issue
// Not solved with documentFragment, same issue... :(
// My guess is that it is simply too much to hold in memory, since
// it freezes even before sortable is called if the table is too big in index.html

document.addEventListener('click', function (e) {
  try {
    // allows for elements inside TH
    function findElementRecursive(element, tag) {
      return element.nodeName === tag ? element : findElementRecursive(element.parentNode, tag)
    }

    var descending_th_class = ' dir-d '
    var ascending_th_class = ' dir-u '
    var ascending_table_sort_class = 'asc'
    var regex_dir = / dir-(u|d) /
    var regex_table = /\bsortable\b/
    var alt_sort = e.shiftKey || e.altKey
    var element = findElementRecursive(e.target, 'TH')
    var tr = findElementRecursive(element, 'TR')
    var table = findElementRecursive(tr, 'TABLE')

    function reClassify(element, dir) {
      element.className = element.className.replace(regex_dir, '') + dir
    }

    function getValue(element) {
      // If you aren't using data-sort and want to make it just the tiniest bit smaller/faster
      // comment this line and uncomment the next one
      return (
        (alt_sort && element.getAttribute('data-sort-alt')) || element.getAttribute('data-sort') || element.innerText
      )
      // return element.innerText
    }
    if (regex_table.test(table.className)) {
      var column_index
      var nodes = tr.cells

      // reset thead cells and get column index
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i] === element) {
          column_index = element.getAttribute('data-sort-col') || i
        } else {
          reClassify(nodes[i], '')
        }
      }

      var dir = descending_th_class

      // check if we're sorting up or down
      if (
        element.className.indexOf(descending_th_class) !== -1 ||
        (table.className.indexOf(ascending_table_sort_class) !== -1 &&
          element.className.indexOf(ascending_th_class) == -1)
      ) {
        dir = ascending_th_class
      }

      // update the `th` class accordingly
      reClassify(element, dir)

      // extract all table rows, so the sorting can start.
      var org_tbody = table.tBodies[0]

      // get the array rows in an array, so we can sort them...
      var rows = [].slice.call(org_tbody.rows, 0)

      var reverse = dir === ascending_th_class

      // sort them using custom built in array sort.
      rows.sort(function (a, b) {
        var x = getValue((reverse ? a : b).cells[column_index])
        var y = getValue((reverse ? b : a).cells[column_index])
        return isNaN(x - y) ? x.localeCompare(y) : x - y
      })

      // Make a clone without content
      var clone_tbody = org_tbody.cloneNode()

      // Build a sorted table body and replace the old one.
      while (rows.length) {
        clone_tbody.appendChild(rows.splice(0, 1)[0])
      }

      // And finally insert the end result
      table.replaceChild(clone_tbody, org_tbody)
    }
  } catch (error) {
    // console.log(error)
  }
})
var vNotify=function(){var a={topLeft:"topLeft",topRight:"topRight",bottomLeft:"bottomLeft",bottomRight:"bottomRight",center:"center"},b={fadeInDuration:1e3,fadeOutDuration:1e3,fadeInterval:50,visibleDuration:5e3,postHoverVisibleDuration:500,position:a.topRight,sticky:!1,showClose:!0},c=function(a){return a.notifyClass="vnotify-info",i(a)},d=function(a){return a.notifyClass="vnotify-success",i(a)},e=function(a){return a.notifyClass="vnotify-error",i(a)},f=function(a){return a.notifyClass="vnotify-warning",i(a)},g=function(a){return a.notifyClass="vnotify-notify",i(a)},h=function(a){return i(a)},i=function(a){if(!a.title&&!a.text)return null;var b=document.createDocumentFragment(),c=document.createElement("div");c.classList.add("vnotify-item"),c.classList.add(a.notifyClass),c.style.opacity=0,c.options=p(a),a.title&&c.appendChild(k(a.title)),a.text&&c.appendChild(j(a.text)),c.options.showClose&&c.appendChild(l(c)),c.visibleDuration=c.options.visibleDuration;var d=function(){c.fadeInterval=r("out",c.options.fadeOutDuration,c)},e=function(){clearTimeout(c.interval),clearTimeout(c.fadeInterval),c.style.opacity=null,c.visibleDuration=c.options.postHoverVisibleDuration},f=function(){c.interval=setTimeout(d,c.visibleDuration)};b.appendChild(c);var g=m(c.options.position);return g.appendChild(b),c.addEventListener("mouseover",e),r("in",c.options.fadeInDuration,c),c.options.sticky||(c.addEventListener("mouseout",f),f()),c},j=function(a){var b=document.createElement("div");return b.classList.add("vnotify-text"),b.innerHTML=a,b},k=function(a){var b=document.createElement("div");return b.classList.add("vnotify-title"),b.innerHTML=a,b},l=function(a){var b=document.createElement("span");return b.classList.add("vn-close"),b.addEventListener("click",function(){q(a)}),b},m=function(a){var b=o(a),c=document.querySelector("."+b);return c?c:n(b)},n=function(a){var b=document.createDocumentFragment();return container=document.createElement("div"),container.classList.add("vnotify-container"),container.classList.add(a),container.setAttribute("role","alert"),b.appendChild(container),document.body.appendChild(b),container},o=function(b){switch(b){case a.topLeft:return"vn-top-left";case a.bottomRight:return"vn-bottom-right";case a.bottomLeft:return"vn-bottom-left";case a.center:return"vn-center";default:return"vn-top-right"}},p=function(a){return{fadeInDuration:a.fadeInDuration||b.fadeInDuration,fadeOutDuration:a.fadeOutDuration||b.fadeOutDuration,fadeInterval:a.fadeInterval||b.fadeInterval,visibleDuration:a.visibleDuration||b.visibleDuration,postHoverVisibleDuration:a.postHoverVisibleDuration||b.postHoverVisibleDuration,position:a.position||b.position,sticky:null!=a.sticky?a.sticky:b.sticky,showClose:null!=a.showClose?a.showClose:b.showClose}},q=function(a){a.style.display="none",a.outerHTML="",a=null},r=function(a,c,d){function e(){g=f?g+i:g-i,d.style.opacity=g,g<=0&&(q(d),s()),(!f&&g<=h||f&&g>=h)&&window.clearInterval(j)}var f="in"===a,g=f?0:d.style.opacity||1,h=f?.8:0,i=b.fadeInterval/c;f&&(d.style.display="block",d.style.opacity=g);var j=window.setInterval(e,b.fadeInterval);return j},s=function(){var a=document.querySelector(".vnotify-item");if(!a)for(var b=document.querySelectorAll(".vnotify-container"),c=0;c<b.length;c++)b[c].outerHTML="",b[c]=null};return{info:c,success:d,error:e,warning:f,notify:g,custom:h,options:b,positionOption:a}}();!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.SlimSelect=t():e.SlimSelect=t()}(window,function(){return n={},s.m=i=[function(e,t,i){"use strict";function n(e,t){t=t||{bubbles:!1,cancelable:!1,detail:void 0};var i=document.createEvent("CustomEvent");return i.initCustomEvent(e,t.bubbles,t.cancelable,t.detail),i}t.__esModule=!0,t.kebabCase=t.highlight=t.isValueInArrayOfObjects=t.debounce=t.putContent=t.ensureElementInView=t.hasClassInTree=void 0,t.hasClassInTree=function(e,t){function n(e,t){return t&&e&&e.classList&&e.classList.contains(t)?e:null}return n(e,t)||function e(t,i){return t&&t!==document?n(t,i)?t:e(t.parentNode,i):null}(e,t)},t.ensureElementInView=function(e,t){var i=e.scrollTop+e.offsetTop,n=i+e.clientHeight,s=t.offsetTop,t=s+t.clientHeight;s<i?e.scrollTop-=i-s:n<t&&(e.scrollTop+=t-n)},t.putContent=function(e,t,i){var n=e.offsetHeight,s=e.getBoundingClientRect(),e=i?s.top:s.top-n,n=i?s.bottom:s.bottom+n;return e<=0?"below":n>=window.innerHeight?"above":i?t:"below"},t.debounce=function(s,a,o){var l;return void 0===a&&(a=100),void 0===o&&(o=!1),function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];var i=self,n=o&&!l;clearTimeout(l),l=setTimeout(function(){l=null,o||s.apply(i,e)},a),n&&s.apply(i,e)}},t.isValueInArrayOfObjects=function(e,t,i){if(!Array.isArray(e))return e[t]===i;for(var n=0,s=e;n<s.length;n++){var a=s[n];if(a&&a[t]&&a[t]===i)return!0}return!1},t.highlight=function(e,t,i){var n=e,s=new RegExp("("+t.trim()+")(?![^<]*>[^<>]*</)","i");if(!e.match(s))return e;var a=e.match(s).index,t=a+e.match(s)[0].toString().length,t=e.substring(a,t);return n=n.replace(s,'<mark class="'.concat(i,'">').concat(t,"</mark>"))},t.kebabCase=function(e){var t=e.replace(/[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g,function(e){return"-"+e.toLowerCase()});return e[0]===e[0].toUpperCase()?t.substring(1):t},"function"!=typeof(t=window).CustomEvent&&(n.prototype=t.Event.prototype,t.CustomEvent=n)},function(e,t,i){"use strict";t.__esModule=!0,t.validateOption=t.validateData=t.Data=void 0;var n=(s.prototype.newOption=function(e){return{id:e.id||String(Math.floor(1e8*Math.random())),value:e.value||"",text:e.text||"",innerHTML:e.innerHTML||"",selected:e.selected||!1,display:void 0===e.display||e.display,disabled:e.disabled||!1,placeholder:e.placeholder||!1,class:e.class||void 0,data:e.data||{},mandatory:e.mandatory||!1}},s.prototype.add=function(e){this.data.push({id:String(Math.floor(1e8*Math.random())),value:e.value,text:e.text,innerHTML:"",selected:!1,display:!0,disabled:!1,placeholder:!1,class:void 0,mandatory:e.mandatory,data:{}})},s.prototype.parseSelectData=function(){this.data=[];for(var e=0,t=this.main.select.element.childNodes;e<t.length;e++){var i=t[e];if("OPTGROUP"===i.nodeName){for(var n={label:i.label,options:[]},s=0,a=i.childNodes;s<a.length;s++){var o,l=a[s];"OPTION"===l.nodeName&&(o=this.pullOptionData(l),n.options.push(o),o.placeholder&&""!==o.text.trim()&&(this.main.config.placeholderText=o.text))}this.data.push(n)}else"OPTION"===i.nodeName&&(o=this.pullOptionData(i),this.data.push(o),o.placeholder&&""!==o.text.trim()&&(this.main.config.placeholderText=o.text))}},s.prototype.pullOptionData=function(e){return{id:!!e.dataset&&e.dataset.id||String(Math.floor(1e8*Math.random())),value:e.value,text:e.text,innerHTML:e.innerHTML,selected:e.selected,disabled:e.disabled,placeholder:"true"===e.dataset.placeholder,class:e.className,style:e.style.cssText,data:e.dataset,mandatory:!!e.dataset&&"true"===e.dataset.mandatory}},s.prototype.setSelectedFromSelect=function(){if(this.main.config.isMultiple){for(var e=[],t=0,i=this.main.select.element.options;t<i.length;t++){var n=i[t];!n.selected||(n=this.getObjectFromData(n.value,"value"))&&n.id&&e.push(n.id)}this.setSelected(e,"id")}else{var s=this.main.select.element;-1!==s.selectedIndex&&(s=s.options[s.selectedIndex].value,this.setSelected(s,"value"))}},s.prototype.setSelected=function(e,t){void 0===t&&(t="id");for(var i=0,n=this.data;i<n.length;i++){var s=n[i];if(s.hasOwnProperty("label")){if(s.hasOwnProperty("options")){var a=s.options;if(a)for(var o=0,l=a;o<l.length;o++){var r=l[o];r.placeholder||(r.selected=this.shouldBeSelected(r,e,t))}}}else s.selected=this.shouldBeSelected(s,e,t)}},s.prototype.shouldBeSelected=function(e,t,i){if(void 0===i&&(i="id"),Array.isArray(t))for(var n=0,s=t;n<s.length;n++){var a=s[n];if(i in e&&String(e[i])===String(a))return!0}else if(i in e&&String(e[i])===String(t))return!0;return!1},s.prototype.getSelected=function(){for(var e={text:"",placeholder:this.main.config.placeholderText},t=[],i=0,n=this.data;i<n.length;i++){var s=n[i];if(s.hasOwnProperty("label")){if(s.hasOwnProperty("options")){var a=s.options;if(a)for(var o=0,l=a;o<l.length;o++){var r=l[o];r.selected&&(this.main.config.isMultiple?t.push(r):e=r)}}}else s.selected&&(this.main.config.isMultiple?t.push(s):e=s)}return this.main.config.isMultiple?t:e},s.prototype.addToSelected=function(e,t){if(void 0===t&&(t="id"),this.main.config.isMultiple){var i=[],n=this.getSelected();if(Array.isArray(n))for(var s=0,a=n;s<a.length;s++){var o=a[s];i.push(o[t])}i.push(e),this.setSelected(i,t)}},s.prototype.removeFromSelected=function(e,t){if(void 0===t&&(t="id"),this.main.config.isMultiple){for(var i=[],n=0,s=this.getSelected();n<s.length;n++){var a=s[n];String(a[t])!==String(e)&&i.push(a[t])}this.setSelected(i,t)}},s.prototype.onDataChange=function(){this.main.onChange&&this.isOnChangeEnabled&&this.main.onChange(JSON.parse(JSON.stringify(this.getSelected())))},s.prototype.getObjectFromData=function(e,t){void 0===t&&(t="id");for(var i=0,n=this.data;i<n.length;i++){var s=n[i];if(t in s&&String(s[t])===String(e))return s;if(s.hasOwnProperty("options"))if(s.options)for(var a=0,o=s.options;a<o.length;a++){var l=o[a];if(String(l[t])===String(e))return l}}return null},s.prototype.search=function(n){var s,e;""!==(this.searchValue=n).trim()?(s=this.main.config.searchFilter,e=this.data.slice(0),n=n.trim(),e=e.map(function(e){if(e.hasOwnProperty("options")){var t=e,i=[];if(0!==(i=t.options?t.options.filter(function(e){return s(e,n)}):i).length){t=Object.assign({},t);return t.options=i,t}}if(e.hasOwnProperty("text")&&s(e,n))return e;return null}),this.filtered=e.filter(function(e){return e})):this.filtered=null},s);function s(e){this.contentOpen=!1,this.contentPosition="below",this.isOnChangeEnabled=!0,this.main=e.main,this.searchValue="",this.data=[],this.filtered=null,this.parseSelectData(),this.setSelectedFromSelect()}function r(e){return void 0!==e.text||(console.error("Data object option must have at least have a text value. Check object: "+JSON.stringify(e)),!1)}t.Data=n,t.validateData=function(e){if(!e)return console.error("Data must be an array of objects"),!1;for(var t=0,i=0,n=e;i<n.length;i++){var s=n[i];if(s.hasOwnProperty("label")){if(s.hasOwnProperty("options")){var a=s.options;if(a)for(var o=0,l=a;o<l.length;o++)r(l[o])||t++}}else r(s)||t++}return 0===t},t.validateOption=r},function(e,t,i){"use strict";t.__esModule=!0;var n=i(3),s=i(4),a=i(5),r=i(1),o=i(0),i=(l.prototype.validate=function(e){e="string"==typeof e.select?document.querySelector(e.select):e.select;if(!e)throw new Error("Could not find select element");if("SELECT"!==e.tagName)throw new Error("Element isnt of type select");return e},l.prototype.selected=function(){if(this.config.isMultiple){for(var e=[],t=0,i=s=this.data.getSelected();t<i.length;t++){var n=i[t];e.push(n.value)}return e}var s;return(s=this.data.getSelected())?s.value:""},l.prototype.set=function(e,t,i,n){void 0===t&&(t="value"),void 0===i&&(i=!0),void 0===n&&(n=!0),this.config.isMultiple&&!Array.isArray(e)?this.data.addToSelected(e,t):this.data.setSelected(e,t),this.select.setValue(),this.data.onDataChange(),this.render(),(i=this.config.hideSelectedOption&&this.config.isMultiple&&this.data.getSelected().length===this.data.data.length?!0:i)&&this.close()},l.prototype.setSelected=function(e,t,i,n){this.set(e,t=void 0===t?"value":t,i=void 0===i?!0:i,n=void 0===n?!0:n)},l.prototype.setData=function(e){if((0,r.validateData)(e)){for(var t=JSON.parse(JSON.stringify(e)),i=this.data.getSelected(),n=0;n<t.length;n++)t[n].value||t[n].placeholder||(t[n].value=t[n].text);if(this.config.isAjax&&i)if(this.config.isMultiple)for(var s=0,a=i.reverse();s<a.length;s++){var o=a[s];t.unshift(o)}else{t.unshift(i);for(n=0;n<t.length;n++)t[n].placeholder||t[n].value!==i.value||t[n].text!==i.text||t.splice(n,1);for(var l=!1,n=0;n<t.length;n++)t[n].placeholder&&(l=!0);l||t.unshift({text:"",placeholder:!0})}this.select.create(t),this.data.parseSelectData(),this.data.setSelectedFromSelect()}else console.error("Validation problem on: #"+this.select.element.id)},l.prototype.addData=function(e){(0,r.validateData)([e])?(this.data.add(this.data.newOption(e)),this.select.create(this.data.data),this.data.parseSelectData(),this.data.setSelectedFromSelect(),this.render()):console.error("Validation problem on: #"+this.select.element.id)},l.prototype.open=function(){var e,t=this;this.config.isEnabled&&(this.data.contentOpen||this.config.hideSelectedOption&&this.config.isMultiple&&this.data.getSelected().length===this.data.data.length||(this.beforeOpen&&this.beforeOpen(),this.config.isMultiple&&this.slim.multiSelected?this.slim.multiSelected.plus.classList.add("ss-cross"):this.slim.singleSelected&&(this.slim.singleSelected.arrowIcon.arrow.classList.remove("arrow-down"),this.slim.singleSelected.arrowIcon.arrow.classList.add("arrow-up")),this.slim[this.config.isMultiple?"multiSelected":"singleSelected"].container.classList.add("above"===this.data.contentPosition?this.config.openAbove:this.config.openBelow),this.config.addToBody&&(e=this.slim.container.getBoundingClientRect(),this.slim.content.style.top=e.top+e.height+window.scrollY+"px",this.slim.content.style.left=e.left+window.scrollX+"px",this.slim.content.style.width=e.width+"px"),this.slim.content.classList.add(this.config.open),"up"===this.config.showContent.toLowerCase()||"down"!==this.config.showContent.toLowerCase()&&"above"===(0,o.putContent)(this.slim.content,this.data.contentPosition,this.data.contentOpen)?this.moveContentAbove():this.moveContentBelow(),this.config.isMultiple||(e=this.data.getSelected())&&(e=e.id,(e=this.slim.list.querySelector('[data-id="'+e+'"]'))&&(0,o.ensureElementInView)(this.slim.list,e)),setTimeout(function(){t.data.contentOpen=!0,t.config.searchFocus&&t.slim.search.input.focus(),t.afterOpen&&t.afterOpen()},this.config.timeoutDelay)))},l.prototype.close=function(){var e=this;this.data.contentOpen&&(this.beforeClose&&this.beforeClose(),this.config.isMultiple&&this.slim.multiSelected?(this.slim.multiSelected.container.classList.remove(this.config.openAbove),this.slim.multiSelected.container.classList.remove(this.config.openBelow),this.slim.multiSelected.plus.classList.remove("ss-cross")):this.slim.singleSelected&&(this.slim.singleSelected.container.classList.remove(this.config.openAbove),this.slim.singleSelected.container.classList.remove(this.config.openBelow),this.slim.singleSelected.arrowIcon.arrow.classList.add("arrow-down"),this.slim.singleSelected.arrowIcon.arrow.classList.remove("arrow-up")),this.slim.content.classList.remove(this.config.open),this.data.contentOpen=!1,this.search(""),setTimeout(function(){e.slim.content.removeAttribute("style"),e.data.contentPosition="below",e.config.isMultiple&&e.slim.multiSelected?(e.slim.multiSelected.container.classList.remove(e.config.openAbove),e.slim.multiSelected.container.classList.remove(e.config.openBelow)):e.slim.singleSelected&&(e.slim.singleSelected.container.classList.remove(e.config.openAbove),e.slim.singleSelected.container.classList.remove(e.config.openBelow)),e.slim.search.input.blur(),e.afterClose&&e.afterClose()},this.config.timeoutDelay))},l.prototype.moveContentAbove=function(){var e=0;this.config.isMultiple&&this.slim.multiSelected?e=this.slim.multiSelected.container.offsetHeight:this.slim.singleSelected&&(e=this.slim.singleSelected.container.offsetHeight);var t=e+this.slim.content.offsetHeight-1;this.slim.content.style.margin="-"+t+"px 0 0 0",this.slim.content.style.height=t-e+1+"px",this.slim.content.style.transformOrigin="center bottom",this.data.contentPosition="above",this.config.isMultiple&&this.slim.multiSelected?(this.slim.multiSelected.container.classList.remove(this.config.openBelow),this.slim.multiSelected.container.classList.add(this.config.openAbove)):this.slim.singleSelected&&(this.slim.singleSelected.container.classList.remove(this.config.openBelow),this.slim.singleSelected.container.classList.add(this.config.openAbove))},l.prototype.moveContentBelow=function(){this.data.contentPosition="below",this.config.isMultiple&&this.slim.multiSelected?(this.slim.multiSelected.container.classList.remove(this.config.openAbove),this.slim.multiSelected.container.classList.add(this.config.openBelow)):this.slim.singleSelected&&(this.slim.singleSelected.container.classList.remove(this.config.openAbove),this.slim.singleSelected.container.classList.add(this.config.openBelow))},l.prototype.enable=function(){this.config.isEnabled=!0,this.config.isMultiple&&this.slim.multiSelected?this.slim.multiSelected.container.classList.remove(this.config.disabled):this.slim.singleSelected&&this.slim.singleSelected.container.classList.remove(this.config.disabled),this.select.triggerMutationObserver=!1,this.select.element.disabled=!1,this.slim.search.input.disabled=!1,this.select.triggerMutationObserver=!0},l.prototype.disable=function(){this.config.isEnabled=!1,this.config.isMultiple&&this.slim.multiSelected?this.slim.multiSelected.container.classList.add(this.config.disabled):this.slim.singleSelected&&this.slim.singleSelected.container.classList.add(this.config.disabled),this.select.triggerMutationObserver=!1,this.select.element.disabled=!0,this.slim.search.input.disabled=!0,this.select.triggerMutationObserver=!0},l.prototype.search=function(t){var i;this.data.searchValue!==t&&(this.slim.search.input.value=t,this.config.isAjax?((i=this).config.isSearching=!0,this.render(),this.ajax&&this.ajax(t,function(e){i.config.isSearching=!1,Array.isArray(e)?(e.unshift({text:"",placeholder:!0}),i.setData(e),i.data.search(t),i.render()):"string"==typeof e?i.slim.options(e):i.render()})):(this.data.search(t),this.render()))},l.prototype.setSearchText=function(e){this.config.searchText=e},l.prototype.render=function(){this.config.isMultiple?this.slim.values():(this.slim.placeholder(),this.slim.deselect()),this.slim.options()},l.prototype.destroy=function(e){var t=(e=void 0===e?null:e)?document.querySelector("."+e+".ss-main"):this.slim.container,i=e?document.querySelector("[data-ssid=".concat(e,"]")):this.select.element;t&&i&&(document.removeEventListener("click",this.documentClick),"auto"===this.config.showContent&&window.removeEventListener("scroll",this.windowScroll,!1),i.style.display="",delete i.dataset.ssid,i.slim=null,t.parentElement&&t.parentElement.removeChild(t),!this.config.addToBody||(e=e?document.querySelector("."+e+".ss-content"):this.slim.content)&&document.body.removeChild(e))},l);function l(e){var t=this;this.ajax=null,this.addable=null,this.beforeOnChange=null,this.onChange=null,this.beforeOpen=null,this.afterOpen=null,this.beforeClose=null,this.afterClose=null,this.windowScroll=(0,o.debounce)(function(e){t.data.contentOpen&&("above"===(0,o.putContent)(t.slim.content,t.data.contentPosition,t.data.contentOpen)?t.moveContentAbove():t.moveContentBelow())}),this.documentClick=function(e){e.target&&!(0,o.hasClassInTree)(e.target,t.config.id)&&t.close()};var i=this.validate(e);i.dataset.ssid&&this.destroy(i.dataset.ssid),e.ajax&&(this.ajax=e.ajax),e.addable&&(this.addable=e.addable),this.config=new n.Config({select:i,isAjax:!!e.ajax,showSearch:e.showSearch,searchPlaceholder:e.searchPlaceholder,searchText:e.searchText,searchingText:e.searchingText,searchFocus:e.searchFocus,searchHighlight:e.searchHighlight,searchFilter:e.searchFilter,closeOnSelect:e.closeOnSelect,showContent:e.showContent,placeholderText:e.placeholder,allowDeselect:e.allowDeselect,allowDeselectOption:e.allowDeselectOption,hideSelectedOption:e.hideSelectedOption,deselectLabel:e.deselectLabel,isEnabled:e.isEnabled,valuesUseText:e.valuesUseText,showOptionTooltips:e.showOptionTooltips,selectByGroup:e.selectByGroup,limit:e.limit,timeoutDelay:e.timeoutDelay,addToBody:e.addToBody}),this.select=new s.Select({select:i,main:this}),this.data=new r.Data({main:this}),this.slim=new a.Slim({main:this}),this.select.element.parentNode&&this.select.element.parentNode.insertBefore(this.slim.container,this.select.element.nextSibling),e.data?this.setData(e.data):this.render(),document.addEventListener("click",this.documentClick),"auto"===this.config.showContent&&window.addEventListener("scroll",this.windowScroll,!1),e.beforeOnChange&&(this.beforeOnChange=e.beforeOnChange),e.onChange&&(this.onChange=e.onChange),e.beforeOpen&&(this.beforeOpen=e.beforeOpen),e.afterOpen&&(this.afterOpen=e.afterOpen),e.beforeClose&&(this.beforeClose=e.beforeClose),e.afterClose&&(this.afterClose=e.afterClose),this.config.isEnabled||this.disable()}t.default=i},function(e,t,i){"use strict";t.__esModule=!0,t.Config=void 0;var n=(s.prototype.searchFilter=function(e,t){return-1!==e.text.toLowerCase().indexOf(t.toLowerCase())},s);function s(e){this.id="",this.isMultiple=!1,this.isAjax=!1,this.isSearching=!1,this.showSearch=!0,this.searchFocus=!0,this.searchHighlight=!1,this.closeOnSelect=!0,this.showContent="auto",this.searchPlaceholder=library.get("Search"),this.searchText=library.get("No Results"),this.searchingText=library.get("Searching..."),this.placeholderText=library.get("Select Value"),this.allowDeselect=!1,this.allowDeselectOption=!1,this.hideSelectedOption=!1,this.deselectLabel="x",this.isEnabled=!0,this.valuesUseText=!1,this.showOptionTooltips=!1,this.selectByGroup=!1,this.limit=0,this.timeoutDelay=200,this.addToBody=!1,this.main="ss-main",this.singleSelected="ss-single-selected",this.arrow="ss-arrow",this.multiSelected="ss-multi-selected",this.add="ss-add",this.plus="ss-plus",this.values="ss-values",this.value="ss-value",this.valueText="ss-value-text",this.valueDelete="ss-value-delete",this.content="ss-content",this.open="ss-open",this.openAbove="ss-open-above",this.openBelow="ss-open-below",this.search="ss-search",this.searchHighlighter="ss-search-highlight",this.addable="ss-addable",this.list="ss-list",this.optgroup="ss-optgroup",this.optgroupLabel="ss-optgroup-label",this.optgroupLabelSelectable="ss-optgroup-label-selectable",this.option="ss-option",this.optionSelected="ss-option-selected",this.highlighted="ss-highlighted",this.disabled="ss-disabled",this.hide="ss-hide",this.id="ss-"+Math.floor(1e5*Math.random()),this.style=e.select.style.cssText,this.class=e.select.className.split(" "),this.isMultiple=e.select.multiple,this.isAjax=e.isAjax,this.showSearch=!1!==e.showSearch,this.searchFocus=!1!==e.searchFocus,this.searchHighlight=!0===e.searchHighlight,this.closeOnSelect=!1!==e.closeOnSelect,e.showContent&&(this.showContent=e.showContent),this.isEnabled=!1!==e.isEnabled,e.searchPlaceholder&&(this.searchPlaceholder=e.searchPlaceholder),e.searchText&&(this.searchText=e.searchText),e.searchingText&&(this.searchingText=e.searchingText),e.placeholderText&&(this.placeholderText=e.placeholderText),this.allowDeselect=!0===e.allowDeselect,this.allowDeselectOption=!0===e.allowDeselectOption,this.hideSelectedOption=!0===e.hideSelectedOption,e.deselectLabel&&(this.deselectLabel=e.deselectLabel),e.valuesUseText&&(this.valuesUseText=e.valuesUseText),e.showOptionTooltips&&(this.showOptionTooltips=e.showOptionTooltips),e.selectByGroup&&(this.selectByGroup=e.selectByGroup),e.limit&&(this.limit=e.limit),e.searchFilter&&(this.searchFilter=e.searchFilter),null!=e.timeoutDelay&&(this.timeoutDelay=e.timeoutDelay),this.addToBody=!0===e.addToBody}t.Config=n},function(e,t,i){"use strict";t.__esModule=!0,t.Select=void 0;var n=i(0),i=(s.prototype.setValue=function(){if(this.main.data.getSelected()){if(this.main.config.isMultiple)for(var e=this.main.data.getSelected(),t=0,i=this.element.options;t<i.length;t++){var n=i[t];n.selected=!1;for(var s=0,a=e;s<a.length;s++)a[s].value===n.value&&(n.selected=!0)}else{e=this.main.data.getSelected();this.element.value=e?e.value:""}this.main.data.isOnChangeEnabled=!1,this.element.dispatchEvent(new CustomEvent("change",{bubbles:!0})),this.main.data.isOnChangeEnabled=!0}},s.prototype.addAttributes=function(){this.element.tabIndex=-1,this.element.style.display="none",this.element.dataset.ssid=this.main.config.id,this.element.setAttribute("aria-hidden","true")},s.prototype.addEventListeners=function(){var t=this;this.element.addEventListener("change",function(e){t.main.data.setSelectedFromSelect(),t.main.render()})},s.prototype.addMutationObserver=function(){var t=this;this.main.config.isAjax||(this.mutationObserver=new MutationObserver(function(e){t.triggerMutationObserver&&(t.main.data.parseSelectData(),t.main.data.setSelectedFromSelect(),t.main.render(),e.forEach(function(e){"class"===e.attributeName&&t.main.slim.updateContainerDivClass(t.main.slim.container)}))}),this.observeMutationObserver())},s.prototype.observeMutationObserver=function(){this.mutationObserver&&this.mutationObserver.observe(this.element,{attributes:!0,childList:!0,characterData:!0})},s.prototype.disconnectMutationObserver=function(){this.mutationObserver&&this.mutationObserver.disconnect()},s.prototype.create=function(e){this.element.innerHTML="";for(var t=0,i=e;t<i.length;t++){var n=i[t];if(n.hasOwnProperty("options")){var s=n,a=document.createElement("optgroup");if(a.label=s.label,s.options)for(var o=0,l=s.options;o<l.length;o++){var r=l[o];a.appendChild(this.createOption(r))}this.element.appendChild(a)}else this.element.appendChild(this.createOption(n))}},s.prototype.createOption=function(t){var i=document.createElement("option");return i.value=""!==t.value?t.value:t.text,i.innerHTML=t.innerHTML||t.text,t.selected&&(i.selected=t.selected),!1===t.display&&(i.style.display="none"),t.disabled&&(i.disabled=!0),t.placeholder&&i.setAttribute("data-placeholder","true"),t.mandatory&&i.setAttribute("data-mandatory","true"),t.class&&t.class.split(" ").forEach(function(e){i.classList.add(e)}),t.data&&"object"==typeof t.data&&Object.keys(t.data).forEach(function(e){i.setAttribute("data-"+(0,n.kebabCase)(e),t.data[e])}),i},s);function s(e){this.triggerMutationObserver=!0,this.element=e.select,this.main=e.main,this.element.disabled&&(this.main.config.isEnabled=!1),this.addAttributes(),this.addEventListeners(),this.mutationObserver=null,this.addMutationObserver(),this.element.slim=e.main}t.Select=i},function(e,t,i){"use strict";t.__esModule=!0,t.Slim=void 0;var n=i(0),o=i(1),i=(s.prototype.containerDiv=function(){var e=document.createElement("div");return e.style.cssText=this.main.config.style,this.updateContainerDivClass(e),e},s.prototype.updateContainerDivClass=function(e){this.main.config.class=this.main.select.element.className.split(" "),e.className="",e.classList.add(this.main.config.id),e.classList.add(this.main.config.main);for(var t=0,i=this.main.config.class;t<i.length;t++){var n=i[t];""!==n.trim()&&e.classList.add(n)}},s.prototype.singleSelectedDiv=function(){var t=this,e=document.createElement("div");e.classList.add(this.main.config.singleSelected);var i=document.createElement("span");i.classList.add("placeholder"),e.appendChild(i);var n=document.createElement("span");n.innerHTML=this.main.config.deselectLabel,n.classList.add("ss-deselect"),n.onclick=function(e){e.stopPropagation(),t.main.config.isEnabled&&t.main.set("")},e.appendChild(n);var s=document.createElement("span");s.classList.add(this.main.config.arrow);var a=document.createElement("span");return a.classList.add("arrow-down"),s.appendChild(a),e.appendChild(s),e.onclick=function(){t.main.config.isEnabled&&(t.main.data.contentOpen?t.main.close():t.main.open())},{container:e,placeholder:i,deselect:n,arrowIcon:{container:s,arrow:a}}},s.prototype.placeholder=function(){var e,t=this.main.data.getSelected();null===t||t&&t.placeholder?((e=document.createElement("span")).classList.add(this.main.config.disabled),e.innerHTML=this.main.config.placeholderText,this.singleSelected&&(this.singleSelected.placeholder.innerHTML=e.outerHTML)):(e="",t&&(e=t.innerHTML&&!0!==this.main.config.valuesUseText?t.innerHTML:t.text),this.singleSelected&&(this.singleSelected.placeholder.innerHTML=t?e:""))},s.prototype.deselect=function(){this.singleSelected&&(!this.main.config.allowDeselect||""===this.main.selected()?this.singleSelected.deselect.classList.add("ss-hide"):this.singleSelected.deselect.classList.remove("ss-hide"))},s.prototype.multiSelectedDiv=function(){var t=this,e=document.createElement("div");e.classList.add(this.main.config.multiSelected);var i=document.createElement("div");i.classList.add(this.main.config.values),e.appendChild(i);var n=document.createElement("div");n.classList.add(this.main.config.add);var s=document.createElement("span");return s.classList.add(this.main.config.plus),s.onclick=function(e){t.main.data.contentOpen&&(t.main.close(),e.stopPropagation())},n.appendChild(s),e.appendChild(n),e.onclick=function(e){t.main.config.isEnabled&&(e.target.classList.contains(t.main.config.valueDelete)||(t.main.data.contentOpen?t.main.close():t.main.open()))},{container:e,values:i,add:n,plus:s}},s.prototype.values=function(){if(this.multiSelected){for(var e=this.multiSelected.values.childNodes,t=this.main.data.getSelected(),i=[],n=0,s=e;n<s.length;n++){for(var a=s[n],o=!0,l=0,r=t;l<r.length;l++){var c=r[l];String(c.id)===String(a.dataset.id)&&(o=!1)}o&&i.push(a)}for(var d=0,h=i;d<h.length;d++){var u=h[d];u.classList.add("ss-out"),this.multiSelected.values.removeChild(u)}for(var p,e=this.multiSelected.values.childNodes,c=0;c<t.length;c++){o=!1;for(var m=0,f=e;m<f.length;m++){a=f[m];String(t[c].id)===String(a.dataset.id)&&(o=!0)}o||(0!==e.length&&HTMLElement.prototype.insertAdjacentElement?0===c?this.multiSelected.values.insertBefore(this.valueDiv(t[c]),e[c]):e[c-1].insertAdjacentElement("afterend",this.valueDiv(t[c])):this.multiSelected.values.appendChild(this.valueDiv(t[c])))}0===t.length&&((p=document.createElement("span")).classList.add(this.main.config.disabled),p.innerHTML=this.main.config.placeholderText,this.multiSelected.values.innerHTML=p.outerHTML)}},s.prototype.valueDiv=function(s){var a=this,e=document.createElement("div");e.classList.add(this.main.config.value),e.dataset.id=s.id;var t=document.createElement("span");return t.classList.add(this.main.config.valueText),t.innerHTML=s.innerHTML&&!0!==this.main.config.valuesUseText?s.innerHTML:s.text,e.appendChild(t),s.mandatory||((t=document.createElement("span")).classList.add(this.main.config.valueDelete),t.innerHTML=this.main.config.deselectLabel,t.onclick=function(e){e.preventDefault(),e.stopPropagation();var t=!1;if(a.main.beforeOnChange||(t=!0),a.main.beforeOnChange){for(var e=a.main.data.getSelected(),i=JSON.parse(JSON.stringify(e)),n=0;n<i.length;n++)i[n].id===s.id&&i.splice(n,1);!1!==a.main.beforeOnChange(i)&&(t=!0)}t&&(a.main.data.removeFromSelected(s.id,"id"),a.main.render(),a.main.select.setValue(),a.main.data.onDataChange())},e.appendChild(t)),e},s.prototype.contentDiv=function(){var e=document.createElement("div");return e.classList.add(this.main.config.content),e},s.prototype.searchDiv=function(){var n=this,e=document.createElement("div"),s=document.createElement("input"),a=document.createElement("div");e.classList.add(this.main.config.search);var t={container:e,input:s};return this.main.config.showSearch||(e.classList.add(this.main.config.hide),s.readOnly=!0),s.type="search",s.placeholder=this.main.config.searchPlaceholder,s.tabIndex=0,s.setAttribute("aria-label",this.main.config.searchPlaceholder),s.setAttribute("autocapitalize","off"),s.setAttribute("autocomplete","off"),s.setAttribute("autocorrect","off"),s.onclick=function(e){setTimeout(function(){""===e.target.value&&n.main.search("")},10)},s.onkeydown=function(e){"ArrowUp"===e.key?(n.main.open(),n.highlightUp(),e.preventDefault()):"ArrowDown"===e.key?(n.main.open(),n.highlightDown(),e.preventDefault()):"Tab"===e.key?n.main.data.contentOpen?n.main.close():setTimeout(function(){n.main.close()},n.main.config.timeoutDelay):"Enter"===e.key&&e.preventDefault()},s.onkeyup=function(e){var t=e.target;if("Enter"===e.key){if(n.main.addable&&e.ctrlKey)return a.click(),e.preventDefault(),void e.stopPropagation();var i=n.list.querySelector("."+n.main.config.highlighted);i&&i.click()}else"ArrowUp"===e.key||"ArrowDown"===e.key||("Escape"===e.key?n.main.close():n.main.config.showSearch&&n.main.data.contentOpen?n.main.search(t.value):s.value="");e.preventDefault(),e.stopPropagation()},s.onfocus=function(){n.main.open()},e.appendChild(s),this.main.addable&&(a.classList.add(this.main.config.addable),a.innerHTML="+",a.onclick=function(e){var t;n.main.addable&&(e.preventDefault(),e.stopPropagation(),""!==(e=n.search.input.value).trim()?(e=n.main.addable(e),t="",e&&("object"==typeof e?(0,o.validateOption)(e)&&(n.main.addData(e),t=e.value||e.text):(n.main.addData(n.main.data.newOption({text:e,value:e})),t=e),n.main.search(""),setTimeout(function(){n.main.set(t,"value",!1,!1)},100),n.main.config.closeOnSelect&&setTimeout(function(){n.main.close()},100))):n.search.input.focus())},e.appendChild(a),t.addable=a),t},s.prototype.highlightUp=function(){var e=this.list.querySelector("."+this.main.config.highlighted),t=null;if(e)for(t=e.previousSibling;null!==t&&t.classList.contains(this.main.config.disabled);)t=t.previousSibling;else var i=this.list.querySelectorAll("."+this.main.config.option+":not(."+this.main.config.disabled+")"),t=i[i.length-1];null!==(t=t&&t.classList.contains(this.main.config.optgroupLabel)?null:t)||(i=e.parentNode).classList.contains(this.main.config.optgroup)&&(!i.previousSibling||(i=i.previousSibling.querySelectorAll("."+this.main.config.option+":not(."+this.main.config.disabled+")")).length&&(t=i[i.length-1])),t&&(e&&e.classList.remove(this.main.config.highlighted),t.classList.add(this.main.config.highlighted),(0,n.ensureElementInView)(this.list,t))},s.prototype.highlightDown=function(){var e,t=this.list.querySelector("."+this.main.config.highlighted),i=null;if(t)for(i=t.nextSibling;null!==i&&i.classList.contains(this.main.config.disabled);)i=i.nextSibling;else i=this.list.querySelector("."+this.main.config.option+":not(."+this.main.config.disabled+")");null!==i||null===t||(e=t.parentNode).classList.contains(this.main.config.optgroup)&&e.nextSibling&&(i=e.nextSibling.querySelector("."+this.main.config.option+":not(."+this.main.config.disabled+")")),i&&(t&&t.classList.remove(this.main.config.highlighted),i.classList.add(this.main.config.highlighted),(0,n.ensureElementInView)(this.list,i))},s.prototype.listDiv=function(){var e=document.createElement("div");return e.classList.add(this.main.config.list),e.setAttribute("role","listbox"),e},s.prototype.options=function(e){void 0===e&&(e="");var t=this.main.data.filtered||this.main.data.data;if((this.list.innerHTML="")!==e)return(i=document.createElement("div")).classList.add(this.main.config.option),i.classList.add(this.main.config.disabled),i.innerHTML=e,void this.list.appendChild(i);if(this.main.config.isAjax&&this.main.config.isSearching)return(i=document.createElement("div")).classList.add(this.main.config.option),i.classList.add(this.main.config.disabled),i.innerHTML=this.main.config.searchingText,void this.list.appendChild(i);if(0===t.length){var i=document.createElement("div");return i.classList.add(this.main.config.option),i.classList.add(this.main.config.disabled),i.innerHTML=this.main.config.searchText,void this.list.appendChild(i)}for(var r=this,n=0,s=t;n<s.length;n++)!function(e){if(e.hasOwnProperty("label")){var t=e,s=document.createElement("div");s.classList.add(r.main.config.optgroup);var i=document.createElement("div");i.classList.add(r.main.config.optgroupLabel),r.main.config.selectByGroup&&r.main.config.isMultiple&&i.classList.add(r.main.config.optgroupLabelSelectable),i.innerHTML=t.label,s.appendChild(i);t=t.options;if(t){for(var a,n=0,o=t;n<o.length;n++){var l=o[n];s.appendChild(r.option(l))}r.main.config.selectByGroup&&r.main.config.isMultiple&&(a=r,i.addEventListener("click",function(e){e.preventDefault(),e.stopPropagation();for(var t=0,i=s.children;t<i.length;t++){var n=i[t];-1!==n.className.indexOf(a.main.config.option)&&n.click()}}))}r.list.appendChild(s)}else r.list.appendChild(r.option(e))}(s[n])},s.prototype.option=function(o){if(o.placeholder){var e=document.createElement("div");return e.classList.add(this.main.config.option),e.classList.add(this.main.config.hide),e}var t=document.createElement("div");t.classList.add(this.main.config.option),t.setAttribute("role","option"),o.class&&o.class.split(" ").forEach(function(e){t.classList.add(e)}),o.style&&(t.style.cssText=o.style);var l=this.main.data.getSelected();t.dataset.id=o.id,this.main.config.searchHighlight&&this.main.slim&&o.innerHTML&&""!==this.main.slim.search.input.value.trim()?t.innerHTML=(0,n.highlight)(o.innerHTML,this.main.slim.search.input.value,this.main.config.searchHighlighter):o.innerHTML&&(t.innerHTML=o.innerHTML),this.main.config.showOptionTooltips&&t.textContent&&t.setAttribute("title",t.textContent);var r=this;t.addEventListener("click",function(e){e.preventDefault(),e.stopPropagation();var t=this.dataset.id;if(!0===o.selected&&r.main.config.allowDeselectOption){var i=!1;if(r.main.beforeOnChange&&r.main.config.isMultiple||(i=!0),r.main.beforeOnChange&&r.main.config.isMultiple){for(var n=r.main.data.getSelected(),s=JSON.parse(JSON.stringify(n)),a=0;a<s.length;a++)s[a].id===t&&s.splice(a,1);!1!==r.main.beforeOnChange(s)&&(i=!0)}i&&(r.main.config.isMultiple?(r.main.data.removeFromSelected(t,"id"),r.main.render(),r.main.select.setValue(),r.main.data.onDataChange()):r.main.set(""))}else o.disabled||o.selected||r.main.config.limit&&Array.isArray(l)&&r.main.config.limit<=l.length||(r.main.beforeOnChange?(n=void 0,(i=JSON.parse(JSON.stringify(r.main.data.getObjectFromData(t)))).selected=!0,r.main.config.isMultiple?(n=JSON.parse(JSON.stringify(l))).push(i):n=JSON.parse(JSON.stringify(i)),!1!==r.main.beforeOnChange(n)&&r.main.set(t,"id",r.main.config.closeOnSelect)):r.main.set(t,"id",r.main.config.closeOnSelect))});e=l&&(0,n.isValueInArrayOfObjects)(l,"id",o.id);return(o.disabled||e)&&(t.onclick=null,r.main.config.allowDeselectOption||t.classList.add(this.main.config.disabled),r.main.config.hideSelectedOption&&t.classList.add(this.main.config.hide)),e?t.classList.add(this.main.config.optionSelected):t.classList.remove(this.main.config.optionSelected),t},s);function s(e){this.main=e.main,this.container=this.containerDiv(),this.content=this.contentDiv(),this.search=this.searchDiv(),this.list=this.listDiv(),this.options(),this.singleSelected=null,this.multiSelected=null,this.main.config.isMultiple?(this.multiSelected=this.multiSelectedDiv(),this.multiSelected&&this.container.appendChild(this.multiSelected.container)):(this.singleSelected=this.singleSelectedDiv(),this.container.appendChild(this.singleSelected.container)),this.main.config.addToBody?(this.content.classList.add(this.main.config.id),document.body.appendChild(this.content)):this.container.appendChild(this.content),this.content.appendChild(this.search.container),this.content.appendChild(this.list)}t.Slim=i}],s.c=n,s.d=function(e,t,i){s.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:i})},s.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},s.t=function(t,e){if(1&e&&(t=s(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var i=Object.create(null);if(s.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var n in t)s.d(i,n,function(e){return t[e]}.bind(null,n));return i},s.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return s.d(t,"a",t),t},s.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},s.p="",s(s.s=2).default;function s(e){if(n[e])return n[e].exports;var t=n[e]={i:e,l:!1,exports:{}};return i[e].call(t.exports,t,t.exports,s),t.l=!0,t.exports}var i,n});
/*!
 * Selectr 2.4.13
 * http://mobius.ovh/docs/selectr
 *
 * Released under the MIT license
 */
(function(root, factory) {
    var plugin = "Selectr";

    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof exports === "object") {
        module.exports = factory(plugin);
    } else {
        root[plugin] = factory(plugin);
    }
}(this, function(plugin) {
    'use strict';

    /**
     * Event Emitter
     */
    var Events = function() {};

    /**
     * Event Prototype
     * @type {Object}
     */
    Events.prototype = {
        /**
         * Add custom event listener
         * @param  {String} event Event type
         * @param  {Function} func   Callback
         * @return {Void}
         */
        on: function(event, func) {
            this._events = this._events || {};
            this._events[event] = this._events[event] || [];
            this._events[event].push(func);
        },

        /**
         * Remove custom event listener
         * @param  {String} event Event type
         * @param  {Function} func   Callback
         * @return {Void}
         */
        off: function(event, func) {
            this._events = this._events || {};
            if (event in this._events === false) return;
            this._events[event].splice(this._events[event].indexOf(func), 1);
        },

        /**
         * Fire a custom event
         * @param  {String} event Event type
         * @return {Void}
         */
        emit: function(event /* , args... */ ) {
            this._events = this._events || {};
            if (event in this._events === false) return;
            for (var i = 0; i < this._events[event].length; i++) {
                this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
            }
        }
    };

    /**
     * Event mixin
     * @param  {Object} obj
     * @return {Object}
     */
    Events.mixin = function(obj) {
        var props = ['on', 'off', 'emit'];
        for (var i = 0; i < props.length; i++) {
            if (typeof obj === 'function') {
                obj.prototype[props[i]] = Events.prototype[props[i]];
            } else {
                obj[props[i]] = Events.prototype[props[i]];
            }
        }
        return obj;
    };

    /**
     * Helpers
     * @type {Object}
     */
    var util = {
      escapeRegExp: function(str) {
        // source from lodash 3.0.0
            var _reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
            var _reHasRegExpChar = new RegExp(_reRegExpChar.source);
            return (str && _reHasRegExpChar.test(str)) ? str.replace(_reRegExpChar, '\\$&') : str;
        },
        extend: function(src, props) {
                    for (var prop in props) {
                            if (props.hasOwnProperty(prop)) {
                                    var val = props[prop];
                                    if (val && Object.prototype.toString.call(val) === "[object Object]") {
                                            src[prop] = src[prop] || {};
                                            util.extend(src[prop], val);
                                    } else {
                                            src[prop] = val;
                                    }
                            }
                    }
                    return src;
        },
        each: function(a, b, c) {
            if ("[object Object]" === Object.prototype.toString.call(a)) {
                for (var d in a) {
                    if (Object.prototype.hasOwnProperty.call(a, d)) {
                        b.call(c, d, a[d], a);
                    }
                }
            } else {
                for (var e = 0, f = a.length; e < f; e++) {
                    b.call(c, e, a[e], a);
                }
            }
        },
        createElement: function(e, a) {
            var d = document,
                el = d.createElement(e);
            if (a && "[object Object]" === Object.prototype.toString.call(a)) {
                var i;
                for (i in a)
                    if (i in el) el[i] = a[i];
                    else if ("html" === i) el.innerHTML = a[i];
                    else el.setAttribute(i, a[i]);
            }
            return el;
        },
        hasClass: function(a, b) {
            if (a)
                return a.classList ? a.classList.contains(b) : !!a.className && !!a.className.match(new RegExp("(\\s|^)" + b + "(\\s|$)"));
        },
        addClass: function(a, b) {
            if (!util.hasClass(a, b)) {
                if (a.classList) {
                    a.classList.add(b);
                } else {
                    a.className = a.className.trim() + " " + b;
                }
            }
        },
        removeClass: function(a, b) {
            if (util.hasClass(a, b)) {
                if (a.classList) {
                    a.classList.remove(b);
                } else {
                    a.className = a.className.replace(new RegExp("(^|\\s)" + b.split(" ").join("|") + "(\\s|$)", "gi"), " ");
                }
            }
        },
        closest: function(el, fn) {
            return el && el !== document.body && (fn(el) ? el : util.closest(el.parentNode, fn));
        },
        isInt: function(val) {
            return typeof val === 'number' && isFinite(val) && Math.floor(val) === val;
        },
        debounce: function(a, b, c) {
            var d;
            return function() {
                var e = this,
                    f = arguments,
                    g = function() {
                        d = null;
                        if (!c) a.apply(e, f);
                    },
                    h = c && !d;
                clearTimeout(d);
                d = setTimeout(g, b);
                if (h) {
                    a.apply(e, f);
                }
            };
        },
        rect: function(el, abs) {
            var w = window;
            var r = el.getBoundingClientRect();
            var x = abs ? w.pageXOffset : 0;
            var y = abs ? w.pageYOffset : 0;

            return {
                bottom: r.bottom + y,
                height: r.height,
                left: r.left + x,
                right: r.right + x,
                top: r.top + y,
                width: r.width
            };
        },
        includes: function(a, b) {
            return a.indexOf(b) > -1;
        },
        startsWith: function(a, b) {
            return a.substr( 0, b.length ) === b;
        },
        truncate: function(el) {
            while (el.firstChild) {
                el.removeChild(el.firstChild);
            }
        }
    };


    function isset(obj, prop) {
        return obj.hasOwnProperty(prop) && (obj[prop] === true || obj[prop].length);
    }

    /**
     * Append an item to the list
     * @param  {Object} item
     * @param  {Object} custom
     * @return {Void}
     */
    function appendItem(item, parent, custom) {
        if (item.parentNode) {
            if (!item.parentNode.parentNode) {
                parent.appendChild(item.parentNode);
            }
        } else {
            parent.appendChild(item);
        }

        util.removeClass(item, "excluded");
        if (!custom) {
            // remove any <span> highlighting, without xss
            item.textContent = item.textContent;
        }
    }

    /**
     * Render the item list
     * @return {Void}
     */
    var render = function() {
        if (this.items.length) {
            var f = document.createDocumentFragment();

            if (this.config.pagination) {
                var pages = this.pages.slice(0, this.pageIndex);

                util.each(pages, function(i, items) {
                    util.each(items, function(j, item) {
                        appendItem(item, f, this.customOption);
                    }, this);
                }, this);
            } else {
                util.each(this.items, function(i, item) {
                    appendItem(item, f, this.customOption);
                }, this);
            }

            // highlight first selected option if any; first option otherwise
            if (f.childElementCount) {
                util.removeClass(this.items[this.navIndex], "active");
                this.navIndex = (
                    f.querySelector(".selectr-option.selected") ||
                    f.querySelector(".selectr-option")
                ).idx;
                util.addClass(this.items[this.navIndex], "active");
            }

            this.tree.appendChild(f);
        }
    };

    /**
     * Dismiss / close the dropdown
     * @param  {obj} e
     * @return {void}
     */
    var dismiss = function(e) {
        var target = e.target;
        if (!this.container.contains(target) && (this.opened || util.hasClass(this.container, "notice"))) {
            this.close();
        }
    };

    /**
     * Build a list item from the HTMLOptionElement
     * @param  {int} i      HTMLOptionElement index
     * @param  {HTMLOptionElement} option
     * @param  {bool} group  Has parent optgroup
     * @return {void}
     */
    var createItem = function(option, data) {
        data = data || option;
        var elementData =  {
            class: "selectr-option",
            role: "treeitem",
            "aria-selected": false
        };

        if(this.customOption){
            elementData.html = this.config.renderOption(data); // asume xss prevention in custom render function
        } else{
            elementData.textContent = option.textContent; // treat all as plain text
        }
        var opt = util.createElement("li",elementData);


        opt.idx = option.idx;

        this.items.push(opt);

        if (option.defaultSelected) {
            this.defaultSelected.push(option.idx);
        }

        if (option.disabled) {
            opt.disabled = true;
            util.addClass(opt, "disabled");
        }

        return opt;
    };

    /**
     * Build the container
     * @return {Void}
     */
    var build = function() {

        this.requiresPagination = this.config.pagination && this.config.pagination > 0;

        // Set width
        if (isset(this.config, "width")) {
            if (util.isInt(this.config.width)) {
                this.width = this.config.width + "px";
            } else {
                if (this.config.width === "auto") {
                    this.width = "100%";
                } else if (util.includes(this.config.width, "%")) {
                    this.width = this.config.width;
                }
            }
        }

        this.container = util.createElement("div", {
            class: "selectr-container"
        });

        // Custom className
        if (this.config.customClass) {
            util.addClass(this.container, this.config.customClass);
        }

        // Mobile device
        if (this.mobileDevice) {
            util.addClass(this.container, "selectr-mobile");
        } else {
            util.addClass(this.container, "selectr-desktop");
        }

        // Hide the HTMLSelectElement and prevent focus
        this.el.tabIndex = -1;

        // Native dropdown
        if (this.config.nativeDropdown || this.mobileDevice) {
            util.addClass(this.el, "selectr-visible");
        } else {
            util.addClass(this.el, "selectr-hidden");
        }

        this.selected = util.createElement("div", {
            class: "selectr-selected",
            disabled: this.disabled,
            tabIndex: 0,
            "aria-expanded": false
        });

        this.label = util.createElement(this.el.multiple ? "ul" : "span", {
            class: "selectr-label"
        });

        var dropdown = util.createElement("div", {
            class: "selectr-options-container"
        });

        this.tree = util.createElement("ul", {
            class: "selectr-options",
            role: "tree",
            "aria-hidden": true,
            "aria-expanded": false
        });

        this.notice = util.createElement("div", {
            class: "selectr-notice"
        });

        this.el.setAttribute("aria-hidden", true);

        if (this.disabled) {
            this.el.disabled = true;
        }

        if (this.el.multiple) {
            util.addClass(this.label, "selectr-tags");
            util.addClass(this.container, "multiple");

            // Collection of tags
            this.tags = [];

            // Collection of selected values
            // #93 defaultSelected = false did not work as expected
            this.selectedValues = (this.config.defaultSelected) ? this.getSelectedProperties('value') : [];

            // Collection of selected indexes
            this.selectedIndexes = this.getSelectedProperties('idx');
        } else {
            // #93 defaultSelected = false did not work as expected
            // these values were undefined
            this.selectedValue = null;
            this.selectedIndex = -1;
        }

        this.selected.appendChild(this.label);

        if (this.config.clearable) {
            this.selectClear = util.createElement("button", {
                class: "selectr-clear",
                type: "button"
            });

            this.container.appendChild(this.selectClear);

            util.addClass(this.container, "clearable");
        }

        if (this.config.taggable) {
            var li = util.createElement('li', {
                class: 'input-tag'
            });
            this.input = util.createElement("input", {
                class: "selectr-tag-input",
                placeholder: this.config.tagPlaceholder,
                tagIndex: 0,
                autocomplete: "off",
                autocorrect: "off",
                autocapitalize: "off",
                spellcheck: "false",
                role: "textbox",
                type: "search"
            });

            li.appendChild(this.input);
            this.label.appendChild(li);
            util.addClass(this.container, "taggable");

            this.tagSeperators = [","];
            if (this.config.tagSeperators) {
                this.tagSeperators = this.tagSeperators.concat(this.config.tagSeperators);
                var _aTempEscapedSeperators = [];
                for(var _nTagSeperatorStepCount = 0; _nTagSeperatorStepCount < this.tagSeperators.length; _nTagSeperatorStepCount++){
                    _aTempEscapedSeperators.push(util.escapeRegExp(this.tagSeperators[_nTagSeperatorStepCount]));
                }
                this.tagSeperatorsRegex = new RegExp(_aTempEscapedSeperators.join('|'),'i');
            } else {
                this.tagSeperatorsRegex = new RegExp(',','i');
            }
        }

        if (this.config.searchable) {
            this.input = util.createElement("input", {
                class: "selectr-input",
                tagIndex: -1,
                autocomplete: "off",
                autocorrect: "off",
                autocapitalize: "off",
                spellcheck: "false",
                role: "textbox",
                type: "search",
                placeholder: this.config.messages.searchPlaceholder
            });
            this.inputClear = util.createElement("button", {
                class: "selectr-input-clear",
                type: "button"
            });
            this.inputContainer = util.createElement("div", {
                class: "selectr-input-container"
            });

            this.inputContainer.appendChild(this.input);
            this.inputContainer.appendChild(this.inputClear);
            dropdown.appendChild(this.inputContainer);
        }

        dropdown.appendChild(this.notice);
        dropdown.appendChild(this.tree);

        // List of items for the dropdown
        this.items = [];

        // Establish options
        this.options = [];

        // Check for options in the element
        if (this.el.options.length) {
            this.options = [].slice.call(this.el.options);
        }

        // Element may have optgroups so
        // iterate element.children instead of element.options
        var group = false,
            j = 0;
        if (this.el.children.length) {
            util.each(this.el.children, function(i, element) {
                if (element.nodeName === "OPTGROUP") {

                    group = util.createElement("ul", {
                        class: "selectr-optgroup",
                        role: "group",
                        html: "<li class='selectr-optgroup--label'>" + element.label + "</li>"
                    });

                    util.each(element.children, function(x, el) {
                        el.idx = j;
                        group.appendChild(createItem.call(this, el, group));
                        j++;
                    }, this);
                } else {
                    element.idx = j;
                    createItem.call(this, element);
                    j++;
                }
            }, this);
        }

        // Options defined by the data option
        if (this.config.data && Array.isArray(this.config.data)) {
            this.data = [];
            var optgroup = false,
                option;

            group = false;
            j = 0;

            util.each(this.config.data, function(i, opt) {
                // Check for group options
                if (isset(opt, "children")) {
                    optgroup = util.createElement("optgroup", {
                        label: opt.text
                    });

                    group = util.createElement("ul", {
                        class: "selectr-optgroup",
                        role: "group",
                        html: "<li class='selectr-optgroup--label'>" + opt.text + "</li>"
                    });

                    util.each(opt.children, function(x, data) {
                        option = new Option(data.text, data.value, false, data.hasOwnProperty("selected") && data.selected === true);

                        option.disabled = isset(data, "disabled");

                        this.options.push(option);

                        optgroup.appendChild(option);

                        option.idx = j;

                        group.appendChild(createItem.call(this, option, data));

                        this.data[j] = data;

                        j++;
                    }, this);

                    this.el.appendChild(optgroup);
                } else {
                    option = new Option(opt.text, opt.value, false, opt.hasOwnProperty("selected") && opt.selected === true);

                    option.disabled = isset(opt, "disabled");

                    this.options.push(option);

                    option.idx = j;

                    createItem.call(this, option, opt);

                    this.data[j] = opt;

                    j++;
                }
            }, this);
        }

        this.setSelected(true);

        var first;
        this.navIndex = 0;
        for (var i = 0; i < this.items.length; i++) {
            first = this.items[i];

            if (!util.hasClass(first, "disabled")) {

                util.addClass(first, "active");
                this.navIndex = i;
                break;
            }
        }

        // Check for pagination / infinite scroll
        if (this.requiresPagination) {
            this.pageIndex = 1;

            // Create the pages
            this.paginate();
        }

        this.container.appendChild(this.selected);
        this.container.appendChild(dropdown);

        this.placeEl = util.createElement("div", {
            class: "selectr-placeholder"
        });

        // Set the placeholder
        this.setPlaceholder();

        this.selected.appendChild(this.placeEl);

        // Disable if required
        if (this.disabled) {
            this.disable();
        }

        this.el.parentNode.insertBefore(this.container, this.el);
        this.container.appendChild(this.el);
    };

    /**
     * Navigate through the dropdown
     * @param  {obj} e
     * @return {void}
     */
    var navigate = function(e) {
        e = e || window.event;

        // Filter out the keys we don"t want
        if (!this.items.length || !this.opened || !util.includes([13, 38, 40], e.which)) {
            this.navigating = false;
            return;
        }

        e.preventDefault();

        if (e.which === 13) {

            if ( this.noResults || (this.config.taggable && this.input.value.length > 0) ) {
                return false;
            }

            return this.change(this.navIndex);
        }

        var direction, prevEl = this.items[this.navIndex];
        var lastIndex = this.navIndex;

        switch (e.which) {
            case 38:
                direction = 0;
                if (this.navIndex > 0) {
                    this.navIndex--;
                }
                break;
            case 40:
                direction = 1;
                if (this.navIndex < this.items.length - 1) {
                    this.navIndex++;
                }
        }

        this.navigating = true;


        // Instead of wasting memory holding a copy of this.items
        // with disabled / excluded options omitted, skip them instead
        while (util.hasClass(this.items[this.navIndex], "disabled") || util.hasClass(this.items[this.navIndex], "excluded")) {
            if (this.navIndex > 0 && this.navIndex < this.items.length -1) {
                if (direction) {
                    this.navIndex++;
                } else {
                    this.navIndex--;
                }
            } else {
                this.navIndex = lastIndex;
                break;
            }

            if (this.searching) {
                if (this.navIndex > this.tree.lastElementChild.idx) {
                    this.navIndex = this.tree.lastElementChild.idx;
                    break;
                } else if (this.navIndex < this.tree.firstElementChild.idx) {
                    this.navIndex = this.tree.firstElementChild.idx;
                    break;
                }
            }
        }

        // Autoscroll the dropdown during navigation
        var r = util.rect(this.items[this.navIndex]);

        if (!direction) {
            if (this.navIndex === 0) {
                this.tree.scrollTop = 0;
            } else if (r.top - this.optsRect.top < 0) {
                this.tree.scrollTop = this.tree.scrollTop + (r.top - this.optsRect.top);
            }
        } else {
            if (this.navIndex === 0) {
                this.tree.scrollTop = 0;
            } else if ((r.top + r.height) > (this.optsRect.top + this.optsRect.height)) {
                this.tree.scrollTop = this.tree.scrollTop + ((r.top + r.height) - (this.optsRect.top + this.optsRect.height));
            }

            // Load another page if needed
            if (this.navIndex === this.tree.childElementCount - 1 && this.requiresPagination) {
                load.call(this);
            }
        }

        if (prevEl) {
            util.removeClass(prevEl, "active");
        }

        util.addClass(this.items[this.navIndex], "active");
    };

    /**
     * Add a tag
     * @param  {HTMLElement} item
     */
    var addTag = function(item) {
        var that = this,
            r;

        var docFrag = document.createDocumentFragment();
        var option = this.options[item.idx];
        var data = this.data ? this.data[item.idx] : option;
        var elementData = { class: "selectr-tag" };
        if (this.customSelected){
            elementData.html = this.config.renderSelection(data); // asume xss prevention in custom render function
        } else {
            elementData.textContent = option.textContent;
        }
        var tag = util.createElement("li", elementData);
        var btn = util.createElement("button", {
            class: "selectr-tag-remove",
            type: "button"
        });

        tag.appendChild(btn);

        // Set property to check against later
        tag.idx = item.idx;
        tag.tag = option.value;

        this.tags.push(tag);

        if (this.config.sortSelected) {

            var tags = this.tags.slice();

            // Deal with values that contain numbers
            r = function(val, arr) {
                val.replace(/(\d+)|(\D+)/g, function(that, $1, $2) {
                    arr.push([$1 || Infinity, $2 || ""]);
                });
            };

            tags.sort(function(a, b) {
                var x = [],
                    y = [],
                    ac, bc;
                if (that.config.sortSelected === true) {
                    ac = a.tag;
                    bc = b.tag;
                } else if (that.config.sortSelected === 'text') {
                    ac = a.textContent;
                    bc = b.textContent;
                }

                r(ac, x);
                r(bc, y);

                while (x.length && y.length) {
                    var ax = x.shift();
                    var by = y.shift();
                    var nn = (ax[0] - by[0]) || ax[1].localeCompare(by[1]);
                    if (nn) return nn;
                }

                return x.length - y.length;
            });

            util.each(tags, function(i, tg) {
                docFrag.appendChild(tg);
            });

            this.label.innerHTML = "";

        } else {
            docFrag.appendChild(tag);
        }

        if (this.config.taggable) {
            this.label.insertBefore(docFrag, this.input.parentNode);
        } else {
            this.label.appendChild(docFrag);
        }
    };

    /**
     * Remove a tag
     * @param  {HTMLElement} item
     * @return {void}
     */
    var removeTag = function(item) {
        var tag = false;

        util.each(this.tags, function(i, t) {
            if (t.idx === item.idx) {
                tag = t;
            }
        }, this);

        if (tag) {
            this.label.removeChild(tag);
            this.tags.splice(this.tags.indexOf(tag), 1);
        }
    };

    /**
     * Load the next page of items
     * @return {void}
     */
    var load = function() {
        var tree = this.tree;
        var scrollTop = tree.scrollTop;
        var scrollHeight = tree.scrollHeight;
        var offsetHeight = tree.offsetHeight;
        var atBottom = scrollTop >= (scrollHeight - offsetHeight);

        if ((atBottom && this.pageIndex < this.pages.length)) {
            var f = document.createDocumentFragment();

            util.each(this.pages[this.pageIndex], function(i, item) {
                appendItem(item, f, this.customOption);
            }, this);

            tree.appendChild(f);

            this.pageIndex++;

            this.emit("selectr.paginate", {
                items: this.items.length,
                total: this.data.length,
                page: this.pageIndex,
                pages: this.pages.length
            });
        }
    };

    /**
     * Clear a search
     * @return {void}
     */
    var clearSearch = function() {
        if (this.config.searchable || this.config.taggable) {
            this.input.value = null;
            this.searching = false;
            if (this.config.searchable) {
                util.removeClass(this.inputContainer, "active");
            }

            if (util.hasClass(this.container, "notice")) {
                util.removeClass(this.container, "notice");
                util.addClass(this.container, "open");
                this.input.focus();
            }

            util.each(this.items, function(i, item) {
                // Items that didn't match need the class
                // removing to make them visible again
                util.removeClass(item, "excluded");
                // Remove the span element for underlining matched items
                if (!this.customOption) {
                    // without xss
                    item.textContent = item.textContent;
                }
            }, this);
        }
    };

    /**
     * Query matching for searches.
     * Wraps matching text in a span.selectr-match.
     *
     * @param  {string} query
     * @param  {HTMLOptionElement} option element
     * @return {bool} true if matched; false otherwise
     */
    var match = function(query, option) {
        var text = option.textContent;
        var RX = new RegExp( query, "ig" );
        var result = RX.exec( text );
        if (result) {
            // #102 stop xss
            option.innerHTML = "";
            var span = document.createElement( "span" );
            span.classList.add( "selectr-match" );
            span.textContent = result[0];
            option.appendChild( document.createTextNode( text.substring( 0, result.index ) ) );
            option.appendChild( span );
            option.appendChild( document.createTextNode( text.substring( RX.lastIndex ) ) );
            return true;
        }
        return false;
    };

    // Main Lib
    var Selectr = function(el, config) {

        if (!el) {
            throw new Error("You must supply either a HTMLSelectElement or a CSS3 selector string.");
        }

        this.el = el;

        // CSS3 selector string
        if (typeof el === "string") {
            this.el = document.querySelector(el);
        }

        if (this.el === null) {
            throw new Error("The element you passed to Selectr can not be found.");
        }

        if (this.el.nodeName.toLowerCase() !== "select") {
            throw new Error("The element you passed to Selectr is not a HTMLSelectElement.");
        }

        this.render(config);
    };

    /**
     * Render the instance
     * @param  {object} config
     * @return {void}
     */
    Selectr.prototype.render = function(config) {

        if (this.rendered) return;

        /**
         * Default configuration options
         * @type {Object}
         */
        var defaultConfig = {
            /**
             * Emulates browser behaviour by selecting the first option by default
             * @type {Boolean}
             */
            defaultSelected: true,

            /**
             * Sets the width of the container
             * @type {String}
             */
            width: "auto",

            /**
             * Enables/ disables the container
             * @type {Boolean}
             */
            disabled: false,

            /**
             * Enables/ disables logic for mobile
             * @type {Boolean}
             */
            disabledMobile: false,

            /**
             * Enables / disables the search function
             * @type {Boolean}
             */
            searchable: true,

            /**
             * Enable disable the clear button
             * @type {Boolean}
             */
            clearable: false,

            /**
             * Sort the tags / multiselect options
             * @type {Boolean}
             */
            sortSelected: false,

            /**
             * Allow deselecting of select-one options
             * @type {Boolean}
             */
            allowDeselect: false,

            /**
             * Close the dropdown when scrolling (@AlexanderReiswich, #11)
             * @type {Boolean}
             */
            closeOnScroll: false,

            /**
             * Allow the use of the native dropdown (@jonnyscholes, #14)
             * @type {Boolean}
             */
            nativeDropdown: false,

            /**
             * Allow the use of native typing behavior for toggling, searching, selecting
             * @type {boolean}
             */
            nativeKeyboard: false,

            /**
             * Set the main placeholder
             * @type {String}
             */
            placeholder: "Select an option...",

            /**
             * Allow the tagging feature
             * @type {Boolean}
             */
            taggable: false,

            /**
             * Set the tag input placeholder (@labikmartin, #21, #22)
             * @type {String}
             */
            tagPlaceholder: "Enter a tag...",

            messages: {
                noResults: "No results.",
                noOptions: "No options available.",
                maxSelections: "A maximum of {max} items can be selected.",
                tagDuplicate: "That tag is already in use.",
                searchPlaceholder: "Search options..."
            }
        };

        // add instance reference (#87)
        this.el.selectr = this;

        // Merge defaults with user set config
        this.config = util.extend(defaultConfig, config);

        // Store type
        this.originalType = this.el.type;

        // Store tabIndex
        this.originalIndex = this.el.tabIndex;

        // Store defaultSelected options for form reset
        this.defaultSelected = [];

        // Store the original option count
        this.originalOptionCount = this.el.options.length;

        if (this.config.multiple || this.config.taggable) {
            this.el.multiple = true;
        }

        // Disabled?
        this.disabled = isset(this.config, "disabled");

        this.opened = false;

        if (this.config.taggable) {
            this.config.searchable = false;
        }

        this.navigating = false;

        this.mobileDevice = false;

        if (!this.config.disabledMobile && /Android|webOS|iPhone|iPad|BlackBerry|Windows Phone|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent)) {
            this.mobileDevice = true;
        }

        this.customOption = this.config.hasOwnProperty("renderOption") && typeof this.config.renderOption === "function";
        this.customSelected = this.config.hasOwnProperty("renderSelection") && typeof this.config.renderSelection === "function";

        this.supportsEventPassiveOption = this.detectEventPassiveOption();

        // Enable event emitter
        Events.mixin(this);

        build.call(this);

        this.bindEvents();

        this.update();

        this.optsRect = util.rect(this.tree);

        this.rendered = true;

        // Fixes macOS Safari bug #28
        if (!this.el.multiple) {
            this.el.selectedIndex = this.selectedIndex;
        }

        var that = this;
        setTimeout(function() {
            that.emit("selectr.init");
        }, 20);
    };

    Selectr.prototype.getSelected = function () {
        var selected = this.el.querySelectorAll('option:checked');
        return selected;
    };

    Selectr.prototype.getSelectedProperties = function (prop) {
        var selected = this.getSelected();
        var values = [].slice.call(selected)
        .map(function(option) { return option[prop]; })
        .filter(function(i) { return i!==null && i!==undefined; });
        return values;
    };

    /**
     * Feature detection: addEventListener passive option
     * https://dom.spec.whatwg.org/#dom-addeventlisteneroptions-passive
     * https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
     */
    Selectr.prototype.detectEventPassiveOption = function () {
        var supportsPassiveOption = false;
        try {
            var opts = Object.defineProperty({}, 'passive', {
                get: function() {
                    supportsPassiveOption = true;
                }
            });
            window.addEventListener('test', null, opts);
        } catch (e) {}
        return supportsPassiveOption;
    };

    /**
     * Attach the required event listeners
     */
    Selectr.prototype.bindEvents = function() {

        var that = this;

        this.events = {};

        this.events.dismiss = dismiss.bind(this);
        this.events.navigate = navigate.bind(this);
        this.events.reset = this.reset.bind(this);

        if (this.config.nativeDropdown || this.mobileDevice) {

            this.container.addEventListener("touchstart", function(e) {
                if (e.changedTouches[0].target === that.el) {
                    that.toggle();
                }
            }, this.supportsEventPassiveOption ? { passive: true } : false);

            this.container.addEventListener("click", function(e) {
                if (e.target === that.el) {
                    that.toggle();
                }
            });

            var getChangedOptions = function(last, current) {
                var added=[], removed=last.slice(0);
                var idx;
                for (var i=0; i<current.length; i++) {
                    idx = removed.indexOf(current[i]);
                    if (idx > -1)
                        removed.splice(idx, 1);
                    else
                        added.push(current[i]);
                }
                return [added, removed];
            };

            // Listen for the change on the native select
            // and update accordingly
            this.el.addEventListener("change", function(e) {
                if (e.__selfTriggered) {
                    return;
                }
                if (that.el.multiple) {
                    var indexes = that.getSelectedProperties('idx');
                    var changes = getChangedOptions(that.selectedIndexes, indexes);

                    util.each(changes[0], function(i, idx) {
                        that.select(idx);
                    }, that);

                    util.each(changes[1], function(i, idx) {
                        that.deselect(idx);
                    }, that);

                } else {
                    if (that.el.selectedIndex > -1) {
                        that.select(that.el.selectedIndex);
                    }
                }
            });

        }

        // Open the dropdown with Enter key if focused
        if ( this.config.nativeDropdown ) {
            this.container.addEventListener("keydown", function(e) {
                if (e.key === "Enter" && that.selected === document.activeElement) {
                    // show native dropdown
                    that.toggle();
                    // focus on it
                    setTimeout(function() {
                        that.el.focus();
                    }, 200);
                }
            });
        }

        // Non-native dropdown
        this.selected.addEventListener("click", function(e) {

            if (!that.disabled) {
                that.toggle();
            }

            e.preventDefault();
        });

        if ( this.config.nativeKeyboard ) {
            var typing = '';
            var typingTimeout = null;

            this.selected.addEventListener("keydown", function (e) {
                // Do nothing if disabled, not focused, or modifier keys are pressed
                if (
                    that.disabled ||
                    that.selected !== document.activeElement ||
                    (e.altKey || e.ctrlKey || e.metaKey)
                ) {
                    return;
                }

                // Open the dropdown on [enter], [ ], [↓], and [↑] keys
                if (
                    e.key === " " ||
                    (! that.opened && ["Enter", "ArrowUp", "ArrowDown"].indexOf(e.key) > -1)
                ) {
                    that.toggle();
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                // Type to search if multiple; type to select otherwise
                // make sure e.key is a single, printable character
                // .length check is a short-circut to skip checking keys like "ArrowDown", etc.
                // prefer "codePoint" methods; they work with the full range of unicode
                if (
                    e.key.length <= 2 &&
                    String[String.fromCodePoint ? "fromCodePoint" : "fromCharCode"](
                        e.key[String.codePointAt ? "codePointAt" : "charCodeAt"]( 0 )
                    ) === e.key
                ) {
                    if ( that.config.multiple ) {
                        that.open();
                        if ( that.config.searchable ) {
                            that.input.value = e.key;
                            that.input.focus();
                            that.search( null, true );
                        }
                    } else {
                        if ( typingTimeout ) {
                            clearTimeout( typingTimeout );
                        }
                        typing += e.key;
                        var found = that.search( typing, true );
                        if ( found && found.length ) {
                            that.clear();
                            that.setValue( found[0].value );
                        }
                        setTimeout(function () { typing = ''; }, 1000);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            });

            // Close the dropdown on [esc] key
            this.container.addEventListener("keyup", function (e) {
                if ( that.opened && e.key === "Escape" ) {
                    that.close();
                    e.stopPropagation();

                    // keep focus so we can re-open easily if desired
                    that.selected.focus();
                }
            });
        }

        // Remove tag
        this.label.addEventListener("click", function(e) {
            if (util.hasClass(e.target, "selectr-tag-remove")) {
                that.deselect(e.target.parentNode.idx);
            }
        });

        // Clear input
        if (this.selectClear) {
            this.selectClear.addEventListener("click", this.clear.bind(this));
        }

        // Prevent text selection
        this.tree.addEventListener("mousedown", function(e) {
            e.preventDefault();
        });

        // Select / deselect items
        this.tree.addEventListener("click", function(e) {
            var item = util.closest(e.target, function(el) {
                return el && util.hasClass(el, "selectr-option");
            });

            if (item) {
                if (!util.hasClass(item, "disabled")) {
                    if (util.hasClass(item, "selected")) {
                        if (that.el.multiple || !that.el.multiple && that.config.allowDeselect) {
                            that.deselect(item.idx);
                        }
                    } else {
                        that.select(item.idx);
                    }

                    if (that.opened && !that.el.multiple) {
                        that.close();
                    }
                }
            }

            e.preventDefault();
            e.stopPropagation();
        });

        // Mouseover list items
        this.tree.addEventListener("mouseover", function(e) {
            if (util.hasClass(e.target, "selectr-option")) {
                if (!util.hasClass(e.target, "disabled")) {
                    util.removeClass(that.items[that.navIndex], "active");

                    util.addClass(e.target, "active");

                    that.navIndex = [].slice.call(that.items).indexOf(e.target);
                }
            }
        });

        // Searchable
        if (this.config.searchable) {
            // Show / hide the search input clear button

            this.input.addEventListener("focus", function(e) {
                that.searching = true;
            });

            this.input.addEventListener("blur", function(e) {
                that.searching = false;
            });

            this.input.addEventListener("keyup", function(e) {
                that.search();

                if (!that.config.taggable) {
                    // Show / hide the search input clear button
                    if (this.value.length) {
                        util.addClass(this.parentNode, "active");
                    } else {
                        util.removeClass(this.parentNode, "active");
                    }
                }
            });

            // Clear the search input
            this.inputClear.addEventListener("click", function(e) {
                that.input.value = null;
                clearSearch.call(that);

                if (!that.tree.childElementCount) {
                    render.call(that);
                }
            });
        }

        if (this.config.taggable) {
            this.input.addEventListener("keyup", function(e) {

                that.search();

                if (that.config.taggable && this.value.length) {
                    var _sVal = this.value.trim();

                    if (_sVal.length && (e.which === 13 || that.tagSeperatorsRegex.test(_sVal) )) {
                        var _sGrabbedTagValue = _sVal.replace(that.tagSeperatorsRegex, '');
                        _sGrabbedTagValue = util.escapeRegExp(_sGrabbedTagValue);
                        _sGrabbedTagValue = _sGrabbedTagValue.trim();

                        var _oOption;
                        if(_sGrabbedTagValue.length){
                            _oOption = that.add({
                                value: _sGrabbedTagValue,
                                textContent: _sGrabbedTagValue,
                                selected: true
                            }, true);
                        }

                        if(_oOption){
                            that.close();
                            clearSearch.call(that);
                        } else {
                            this.value = '';
                            that.setMessage(that.config.messages.tagDuplicate);
                        }
                    }
                }
            });
        }

        this.update = util.debounce(function() {
            // Optionally close dropdown on scroll / resize (#11)
            if (that.opened && that.config.closeOnScroll) {
                that.close();
            }
            if (that.width) {
                that.container.style.width = that.width;
            }
            that.invert();
        }, 50);

        if (this.requiresPagination) {
            this.paginateItems = util.debounce(function() {
                load.call(this);
            }, 50);

            this.tree.addEventListener("scroll", this.paginateItems.bind(this));
        }

        // Dismiss when clicking outside the container
        document.addEventListener("click", this.events.dismiss);
        window.addEventListener("keydown", this.events.navigate);

        window.addEventListener("resize", this.update);
        window.addEventListener("scroll", this.update);

        // remove event listeners on destroy()
        this.on('selectr.destroy', function () {
            document.removeEventListener("click", this.events.dismiss);
            window.removeEventListener("keydown", this.events.navigate);
            window.removeEventListener("resize", this.update);
            window.removeEventListener("scroll", this.update);
        });

        // Listen for form.reset() (@ambrooks, #13)
        if (this.el.form) {
            this.el.form.addEventListener("reset", this.events.reset);

            // remove listener on destroy()
            this.on('selectr.destroy', function () {
                this.el.form.removeEventListener("reset", this.events.reset);
            });
        }
    };

    /**
     * Check for selected options
     * @param {bool} reset
     */
    Selectr.prototype.setSelected = function(reset) {

        // Select first option as with a native select-one element - #21, #24
        if (!this.config.data && !this.el.multiple && this.el.options.length) {
            // Browser has selected the first option by default
            if (this.el.selectedIndex === 0) {
                if (!this.el.options[0].defaultSelected && !this.config.defaultSelected) {
                    this.el.selectedIndex = -1;
                }
            }

            this.selectedIndex = this.el.selectedIndex;

            if (this.selectedIndex > -1) {
                this.select(this.selectedIndex);
            }
        }

        // If we're changing a select-one to select-multiple via the config
        // and there are no selected options, the first option will be selected by the browser
        // Let's prevent that here.
        if (this.config.multiple && this.originalType === "select-one" && !this.config.data) {
            if (this.el.options[0].selected && !this.el.options[0].defaultSelected) {
                this.el.options[0].selected = false;
            }
        }

        util.each(this.options, function(i, option) {
            if (option.selected && option.defaultSelected) {
                this.select(option.idx);
            }
        }, this);

        if (this.config.selectedValue) {
            this.setValue(this.config.selectedValue);
        }

        if (this.config.data) {


            if (!this.el.multiple && this.config.defaultSelected && this.el.selectedIndex < 0 && this.config.data.length > 0) {
                this.select(0);
            }

            var j = 0;
            util.each(this.config.data, function(i, opt) {
                // Check for group options
                if (isset(opt, "children")) {
                    util.each(opt.children, function(x, item) {
                        if (item.hasOwnProperty("selected") && item.selected === true) {
                            this.select(j);
                        }
                        j++;
                    }, this);
                } else {
                    if (opt.hasOwnProperty("selected") && opt.selected === true) {
                        this.select(j);
                    }
                    j++;
                }
            }, this);
        }
    };

    /**
     * Destroy the instance
     * @return {void}
     */
    Selectr.prototype.destroy = function() {

        if (!this.rendered) return;

        this.emit("selectr.destroy");

        // Revert to select-single if programtically set to multiple
        if (this.originalType === 'select-one') {
            this.el.multiple = false;
        }

        if (this.config.data) {
            this.el.innerHTML = "";
        }

        // Remove the className from select element
        util.removeClass(this.el, 'selectr-hidden');

        // Replace the container with the original select element
        this.container.parentNode.replaceChild(this.el, this.container);

        this.rendered = false;

        // remove reference
        delete this.el.selectr;
    };

    /**
     * Change an options state
     * @param  {Number} index
     * @return {void}
     */
    Selectr.prototype.change = function(index) {
        var item = this.items[index],
            option = this.options[index];

        if (option.disabled) {
            return;
        }

        if (option.selected && util.hasClass(item, "selected")) {
            this.deselect(index);
        } else {
            this.select(index);
        }

        if (this.opened && !this.el.multiple) {
            this.close();
        }
    };

    /**
     * Select an option
     * @param  {Number} index
     * @return {void}
     */
    Selectr.prototype.select = function(index) {

        var item = this.items[index],
            options = [].slice.call(this.el.options),
            option = this.options[index];

        if (this.el.multiple) {
            if (util.includes(this.selectedIndexes, index)) {
                return false;
            }

            if (this.config.maxSelections && this.tags.length === this.config.maxSelections) {
                this.setMessage(this.config.messages.maxSelections.replace("{max}", this.config.maxSelections), true);
                return false;
            }

            this.selectedValues.push(option.value);
            this.selectedIndexes.push(index);

            addTag.call(this, item);
        } else {
            var data = this.data ? this.data[index] : option;
            if (this.customSelected) {
                this.label.innerHTML = this.config.renderSelection(data);
            } else {
                // no xss
                this.label.textContent = option.textContent;
            }

            this.selectedValue = option.value;
            this.selectedIndex = index;

            util.each(this.options, function(i, o) {
                var opt = this.items[i];

                if (i !== index) {
                    if (opt) {
                        util.removeClass(opt, "selected");
                    }
                    o.selected = false;
                    o.removeAttribute("selected");
                }
            }, this);
        }

        if (!util.includes(options, option)) {
            this.el.add(option);
        }

        item.setAttribute("aria-selected", true);

        util.addClass(item, "selected");
        util.addClass(this.container, "has-selected");

        option.selected = true;
        option.setAttribute("selected", "");

        this.emit("selectr.change", option);

        this.emit("selectr.select", option);

        // fire native change event
        if ("createEvent" in document) {
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent("change", true, true);
            evt.__selfTriggered = true;
            this.el.dispatchEvent(evt);
        } else {
            this.el.fireEvent("onchange");
        }
    };

    /**
     * Deselect an option
     * @param  {Number} index
     * @return {void}
     */
    Selectr.prototype.deselect = function(index, force) {
        var item = this.items[index],
            option = this.options[index];

        if (this.el.multiple) {
            var selIndex = this.selectedIndexes.indexOf(index);
            this.selectedIndexes.splice(selIndex, 1);

            var valIndex = this.selectedValues.indexOf(option.value);
            this.selectedValues.splice(valIndex, 1);

            removeTag.call(this, item);

            if (!this.tags.length) {
                util.removeClass(this.container, "has-selected");
            }
        } else {

            if (!force && !this.config.clearable && !this.config.allowDeselect) {
                return false;
            }

            this.label.innerHTML = "";
            this.selectedValue = null;

            this.el.selectedIndex = this.selectedIndex = -1;

            util.removeClass(this.container, "has-selected");
        }


        this.items[index].setAttribute("aria-selected", false);

        util.removeClass(this.items[index], "selected");

        option.selected = false;

        option.removeAttribute("selected");

        this.emit("selectr.change", null);

        this.emit("selectr.deselect", option);

        // fire native change event
        if ("createEvent" in document) {
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent("change", true, true);
            evt.__selfTriggered = true;
            this.el.dispatchEvent(evt);
        } else {
            this.el.fireEvent("onchange");
        }
    };

    /**
     * Programmatically set selected values
     * @param {String|Array} value - A string or an array of strings
     */
    Selectr.prototype.setValue = function(value) {
        var isArray = Array.isArray(value);

        if (!isArray) {
            value = value.toString().trim();
        }

        // Can't pass array to select-one
        if (!this.el.multiple && isArray) {
            return false;
        }

        util.each(this.options, function(i, option) {
            if (isArray && (value.indexOf(option.value) > -1) || option.value === value) {
                this.change(option.idx);
            }
        }, this);
    };

    /**
     * Set the selected value(s)
     * @param  {bool} toObject Return only the raw values or an object
     * @param  {bool} toJson   Return the object as a JSON string
     * @return {mixed}         Array or String
     */
    Selectr.prototype.getValue = function(toObject, toJson) {
        var value;

        if (this.el.multiple) {
            if (toObject) {
                if (this.selectedIndexes.length) {
                    value = {};
                    value.values = [];
                    util.each(this.selectedIndexes, function(i, index) {
                        var option = this.options[index];
                        value.values[i] = {
                            value: option.value,
                            text: option.textContent
                        };
                    }, this);
                }
            } else {
                value = this.selectedValues.slice();
            }
        } else {
            if (toObject) {
                var option = this.options[this.selectedIndex];
                value = {
                    value: option.value,
                    text: option.textContent
                };
            } else {
                value = this.selectedValue;
            }
        }

        if (toObject && toJson) {
            value = JSON.stringify(value);
        }

        return value;
    };

    /**
     * Add a new option or options
     * @param {object} data
     */
    Selectr.prototype.add = function(data, checkDuplicate) {
        if (data) {
            this.data = this.data || [];
            this.items = this.items || [];
            this.options = this.options || [];

            if (Array.isArray(data)) {
                // We have an array on items
                util.each(data, function(i, obj) {
                    this.add(obj, checkDuplicate);
                }, this);
            }
            // User passed a single object to the method
            // or Selectr passed an object from an array
            else if ("[object Object]" === Object.prototype.toString.call(data)) {

                if (checkDuplicate) {
                    var dupe = false;

                    util.each(this.options, function(i, option) {
                        if (option.value.toLowerCase() === data.value.toLowerCase()) {
                            dupe = true;
                        }
                    });

                    if (dupe) {
                        return false;
                    }
                }

                var option = util.createElement('option', data);

                this.data.push(data);

                // fix for native iOS dropdown otherwise the native dropdown will be empty
                if (this.mobileDevice) {
                    this.el.add(option);
                }

                // Add the new option to the list
                this.options.push(option);

                // Add the index for later use
                option.idx = this.options.length > 0 ? this.options.length - 1 : 0;

                // Create a new item
                createItem.call(this, option);

                // Select the item if required
                if (data.selected) {
                    this.select(option.idx);
                }

                                // We may have had an empty select so update
                                // the placeholder to reflect the changes.
                                this.setPlaceholder();

                return option;
            }

            // Recount the pages
            if (this.config.pagination) {
                this.paginate();
            }

            return true;
        }
    };

    /**
     * Remove an option or options
     * @param  {Mixed} o Array, integer (index) or string (value)
     * @return {Void}
     */
    Selectr.prototype.remove = function(o) {
        var options = [];
        if (Array.isArray(o)) {
            util.each(o, function(i, opt) {
                if (util.isInt(opt)) {
                    options.push(this.getOptionByIndex(opt));
                } else if (typeof opt === "string") {
                    options.push(this.getOptionByValue(opt));
                }
            }, this);

        } else if (util.isInt(o)) {
            options.push(this.getOptionByIndex(o));
        } else if (typeof o === "string") {
            options.push(this.getOptionByValue(o));
        }

        if (options.length) {
            var index;
            util.each(options, function(i, option) {
                index = option.idx;

                // Remove the HTMLOptionElement
                this.el.remove(option);

                // Remove the reference from the option array
                this.options.splice(index, 1);

                // If the item has a parentNode (group element) it needs to be removed
                // otherwise the render function will still append it to the dropdown
                var parentNode = this.items[index].parentNode;

                if (parentNode) {
                    parentNode.removeChild(this.items[index]);
                }

                // Remove reference from the items array
                this.items.splice(index, 1);

                // Reset the indexes
                util.each(this.options, function(i, opt) {
                    opt.idx = i;
                    this.items[i].idx = i;
                }, this);
            }, this);

            // We may have had an empty select now so update
            // the placeholder to reflect the changes.
            this.setPlaceholder();

            // Recount the pages
            if (this.config.pagination) {
                this.paginate();
            }
        }
    };

    /**
     * Remove all options
     */
    Selectr.prototype.removeAll = function() {

        // Clear any selected options
        this.clear(true);

        // Remove the HTMLOptionElements
        util.each(this.el.options, function(i, option) {
            this.el.remove(option);
        }, this);

        // Empty the dropdown
        util.truncate(this.tree);

        // Reset variables
        this.items = [];
        this.options = [];
        this.data = [];

        this.navIndex = 0;

        if (this.requiresPagination) {
            this.requiresPagination = false;

            this.pageIndex = 1;
            this.pages = [];
        }

        // Update the placeholder
        this.setPlaceholder();
    };

    /**
     * Perform a search
     * @param {string}|{null} query The query string (taken from user input if null)
     * @param {boolean} anchor Anchor search to beginning of strings (defaults to false)?
     * @return {Array} Search results, as an array of {text, value} objects
     */
    Selectr.prototype.search = function( string, anchor ) {
        if ( this.navigating ) {
            return;
        }

        // we're only going to alter the DOM for "live" searches
        var live = false;
        if ( ! string ) {
            string = this.input.value;
            live = true;

            // Remove message and clear dropdown
            this.removeMessage();
            util.truncate(this.tree);
        }
        var results = [];
        var f = document.createDocumentFragment();

        string = string.trim().toLowerCase();

        if ( string.length > 0 ) {
            var compare = anchor ? util.startsWith : util.includes;

            util.each( this.options, function ( i, option ) {
                var item = this.items[option.idx];
                var matches = compare( option.textContent.trim().toLowerCase().replace(/-|\s/g,""), string.replace(/-|\s/g,"") );

                if ( matches && !option.disabled ) {
                    results.push( { text: option.textContent, value: option.value } );
                    if ( live ) {
                        appendItem( item, f, this.customOption );
                        util.removeClass( item, "excluded" );

                        // Underline the matching results
                        if ( !this.customOption ) {
                            match( string, option );
                        }
                    }
                } else if ( live ) {
                    util.addClass( item, "excluded" );
                }
            }, this);

            if ( live ) {
                // Append results
                if ( !f.childElementCount ) {
                    if ( !this.config.taggable ) {
                        this.noResults = true;
                        this.setMessage( this.config.messages.noResults );
                    }
                } else {
                    // Highlight top result (@binary-koan #26)
                    var prevEl = this.items[this.navIndex];
                    var firstEl = f.querySelector(".selectr-option:not(.excluded)");
                    this.noResults = false;

                    util.removeClass( prevEl, "active" );
                    this.navIndex = firstEl.idx;
                    util.addClass( firstEl, "active" );
                }

                this.tree.appendChild( f );
            }
        } else {
            render.call(this);
        }

        return results;
    };

    /**
     * Toggle the dropdown
     * @return {void}
     */
    Selectr.prototype.toggle = function() {
        if (!this.disabled) {
            if (this.opened) {
                this.close();
            } else {
                this.open();
            }
        }
    };

    /**
     * Open the dropdown
     * @return {void}
     */
    Selectr.prototype.open = function() {

        var that = this;

        if (!this.options.length) {
            return false;
        }

        if (!this.opened) {
            this.emit("selectr.open");
        }

        this.opened = true;

        if (this.mobileDevice || this.config.nativeDropdown) {
            util.addClass(this.container, "native-open");

            if (this.config.data && this.el.options.length === 0) {
                // Dump the options into the select
                // otherwise the native dropdown will be empty
                util.each(this.options, function(i, option) {
                    this.el.add(option);
                }, this);
            }

            return;
        }

        util.addClass(this.container, "open");

        render.call(this);

        this.invert();

        this.tree.scrollTop = 0;

        util.removeClass(this.container, "notice");

        this.selected.setAttribute("aria-expanded", true);

        this.tree.setAttribute("aria-hidden", false);
        this.tree.setAttribute("aria-expanded", true);

        if (this.config.searchable && !this.config.taggable) {
            setTimeout(function() {
                that.input.focus();
                // Allow tab focus
                that.input.tabIndex = 0;
            }, 10);
        }
    };

    /**
     * Close the dropdown
     * @return {void}
     */
    Selectr.prototype.close = function() {

        if (this.opened) {
            this.emit("selectr.close");
        }

        this.opened = false;
        this.navigating = false;

        if (this.mobileDevice || this.config.nativeDropdown) {
            util.removeClass(this.container, "native-open");
            return;
        }

        var notice = util.hasClass(this.container, "notice");

        if (this.config.searchable && !notice) {
            this.input.blur();
            // Disable tab focus
            this.input.tabIndex = -1;
            this.searching = false;
        }

        if (notice) {
            util.removeClass(this.container, "notice");
            this.notice.textContent = "";
        }

        util.removeClass(this.container, "open");
        util.removeClass(this.container, "native-open");

        this.selected.setAttribute("aria-expanded", false);

        this.tree.setAttribute("aria-hidden", true);
        this.tree.setAttribute("aria-expanded", false);

        util.truncate(this.tree);
        clearSearch.call(this);
    };


    /**
     * Enable the element
     * @return {void}
     */
    Selectr.prototype.enable = function() {
        this.disabled = false;
        this.el.disabled = false;

        this.selected.tabIndex = this.originalIndex;

        if (this.el.multiple) {
            util.each(this.tags, function(i, t) {
                t.lastElementChild.tabIndex = 0;
            });
        }

        util.removeClass(this.container, "selectr-disabled");
    };

    /**
     * Disable the element
     * @param  {boolean} container Disable the container only (allow value submit with form)
     * @return {void}
     */
    Selectr.prototype.disable = function(container) {
        if (!container) {
            this.el.disabled = true;
        }

        this.selected.tabIndex = -1;

        if (this.el.multiple) {
            util.each(this.tags, function(i, t) {
                t.lastElementChild.tabIndex = -1;
            });
        }

        this.disabled = true;
        util.addClass(this.container, "selectr-disabled");
    };


    /**
     * Reset to initial state
     * @return {void}
     */
    Selectr.prototype.reset = function() {
        if (!this.disabled) {
            this.clear();

            this.setSelected(true);

            util.each(this.defaultSelected, function(i, idx) {
                this.select(idx);
            }, this);

            this.emit("selectr.reset");
        }
    };

    /**
     * Clear all selections
     * @return {void}
     */
    Selectr.prototype.clear = function(force, isClearLast) {

        if (this.el.multiple) {
            // Loop over the selectedIndexes so we don't have to loop over all the options
            // which can be costly if there are a lot of them

            if (this.selectedIndexes.length) {
                // Copy the array or we'll get an error
                var indexes = this.selectedIndexes.slice();

                if (isClearLast) {
                    this.deselect(indexes.slice(-1)[0]);
                } else {
                    util.each(indexes, function(i, idx) {
                        this.deselect(idx);
                    }, this);
                }
            }
        } else {
            if (this.selectedIndex > -1) {
                this.deselect(this.selectedIndex, force);
            }
        }

        this.emit("selectr.clear");
    };

    /**
     * Return serialised data
     * @param  {boolean} toJson
     * @return {mixed} Returns either an object or JSON string
     */
    Selectr.prototype.serialise = function(toJson) {
        var data = [];
        util.each(this.options, function(i, option) {
            var obj = {
                value: option.value,
                text: option.textContent
            };

            if (option.selected) {
                obj.selected = true;
            }
            if (option.disabled) {
                obj.disabled = true;
            }
            data[i] = obj;
        });

        return toJson ? JSON.stringify(data) : data;
    };

    /**
     * Localised version of serialise() method
     */
    Selectr.prototype.serialize = function(toJson) {
        return this.serialise(toJson);
    };

    /**
     * Sets the placeholder
     * @param {String} placeholder
     */
    Selectr.prototype.setPlaceholder = function(placeholder) {
        // Set the placeholder
        placeholder = placeholder || this.config.placeholder || this.el.getAttribute("placeholder");

        if (!this.options.length) {
            placeholder = this.config.messages.noOptions;
        }

        this.placeEl.innerHTML = placeholder;
    };

    /**
     * Paginate the option list
     * @return {Array}
     */
    Selectr.prototype.paginate = function() {
        if (this.items.length) {
            var that = this;

            this.pages = this.items.map(function(v, i) {
                return i % that.config.pagination === 0 ? that.items.slice(i, i + that.config.pagination) : null;
            }).filter(function(pages) {
                return pages;
            });

            return this.pages;
        }
    };

    /**
     * Display a message
     * @param  {String} message The message
     */
    Selectr.prototype.setMessage = function(message, close) {
        if (close) {
            this.close();
        }
        util.addClass(this.container, "notice");
        this.notice.textContent = message;
    };

    /**
     * Dismiss the current message
     */
    Selectr.prototype.removeMessage = function() {
        util.removeClass(this.container, "notice");
        this.notice.innerHTML = "";
    };

    /**
     * Keep the dropdown within the window
     * @return {void}
     */
    Selectr.prototype.invert = function() {
        var rt = util.rect(this.selected),
            oh = this.tree.parentNode.offsetHeight,
            wh = window.innerHeight,
            doInvert = rt.top + rt.height + oh > wh;

        if (doInvert) {
            util.addClass(this.container, "inverted");
            this.isInverted = true;
        } else {
            util.removeClass(this.container, "inverted");
            this.isInverted = false;
        }

        this.optsRect = util.rect(this.tree);
    };

    /**
     * Get an option via it's index
     * @param  {Integer} index The index of the HTMLOptionElement required
     * @return {HTMLOptionElement}
     */
    Selectr.prototype.getOptionByIndex = function(index) {
        return this.options[index];
    };

    /**
     * Get an option via it's value
     * @param  {String} value The value of the HTMLOptionElement required
     * @return {HTMLOptionElement}
     */
    Selectr.prototype.getOptionByValue = function(value) {
        var option = false;

        for (var i = 0, l = this.options.length; i < l; i++) {
            if (this.options[i].value.trim() === value.toString().trim()) {
                option = this.options[i];
                break;
            }
        }

        return option;
    };

    return Selectr;
}));
/*!
 * baguetteBox.js
 * @author  feimosi
 * @version 1.11.1
 * @url https://github.com/feimosi/baguetteBox.js
 */

/* global define, module */

(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.baguetteBox = factory();
    }
}(this, function () {
    'use strict';

    // SVG shapes used on the buttons
    var leftArrow = '<svg width="44" height="60">' +
            '<polyline points="30 10 10 30 30 50" stroke="rgba(255,255,255,0.5)" stroke-width="4"' +
              'stroke-linecap="butt" fill="none" stroke-linejoin="round"/>' +
            '</svg>',
        rightArrow = '<svg width="44" height="60">' +
            '<polyline points="14 10 34 30 14 50" stroke="rgba(255,255,255,0.5)" stroke-width="4"' +
              'stroke-linecap="butt" fill="none" stroke-linejoin="round"/>' +
            '</svg>',
        closeX = '<svg width="30" height="30">' +
            '<g stroke="rgb(160,160,160)" stroke-width="4">' +
            '<line x1="5" y1="5" x2="25" y2="25"/>' +
            '<line x1="5" y1="25" x2="25" y2="5"/>' +
            '</g></svg>';
    // Global options and their defaults
    var options = {},
        defaults = {
            captions: true,
            buttons: 'auto',
            fullScreen: false,
            noScrollbars: false,
            bodyClass: 'baguetteBox-open',
            titleTag: false,
            async: false,
            preload: 2,
            animation: 'slideIn',
            afterShow: null,
            afterHide: null,
            onChange: null,
            overlayBackgroundColor: 'rgba(0,0,0,.8)'
        };
    // Object containing information about features compatibility
    var supports = {};
    // DOM Elements references
    var overlay, slider, previousButton, nextButton, closeButton;
    // An array with all images in the current gallery
    var currentGallery = [];
    // Current image index inside the slider
    var currentIndex = 0;
    // Visibility of the overlay
    var isOverlayVisible = false;
    // Touch event start position (for slide gesture)
    var touch = {};
    // If set to true ignore touch events because animation was already fired
    var touchFlag = false;
    // Regex pattern to match image files
    var regex = /.+\.(gif|jpe?g|png|webp)/i;
    // Object of all used galleries
    var data = {};
    // Array containing temporary images DOM elements
    var imagesElements = [];
    // The last focused element before opening the overlay
    var documentLastFocus = null;
    var overlayClickHandler = function(event) {
        // Close the overlay when user clicks directly on the background
        if (event.target.id.indexOf('baguette-img') !== -1) {
            hideOverlay();
        }
    };
    var previousButtonClickHandler = function(event) {
        event.stopPropagation ? event.stopPropagation() : event.cancelBubble = true; // eslint-disable-line no-unused-expressions
        showPreviousImage();
    };
    var nextButtonClickHandler = function(event) {
        event.stopPropagation ? event.stopPropagation() : event.cancelBubble = true; // eslint-disable-line no-unused-expressions
        showNextImage();
    };
    var closeButtonClickHandler = function(event) {
        event.stopPropagation ? event.stopPropagation() : event.cancelBubble = true; // eslint-disable-line no-unused-expressions
        hideOverlay();
    };
    var touchstartHandler = function(event) {
        touch.count++;
        if (touch.count > 1) {
            touch.multitouch = true;
        }
        // Save x and y axis position
        touch.startX = event.changedTouches[0].pageX;
        touch.startY = event.changedTouches[0].pageY;
    };
    var touchmoveHandler = function(event) {
        // If action was already triggered or multitouch return
        if (touchFlag || touch.multitouch) {
            return;
        }
        event.preventDefault ? event.preventDefault() : event.returnValue = false; // eslint-disable-line no-unused-expressions
        var touchEvent = event.touches[0] || event.changedTouches[0];
        // Move at least 40 pixels to trigger the action
        if (touchEvent.pageX - touch.startX > 40) {
            touchFlag = true;
            showPreviousImage();
        } else if (touchEvent.pageX - touch.startX < -40) {
            touchFlag = true;
            showNextImage();
        // Move 100 pixels up to close the overlay
        } else if (touch.startY - touchEvent.pageY > 100) {
            hideOverlay();
        }
    };
    var touchendHandler = function() {
        touch.count--;
        if (touch.count <= 0) {
            touch.multitouch = false;
        }
        touchFlag = false;
    };
    var contextmenuHandler = function() {
        touchendHandler();
    };

    var trapFocusInsideOverlay = function(event) {
        if (overlay.style.display === 'block' && (overlay.contains && !overlay.contains(event.target))) {
            event.stopPropagation();
            initFocus();
        }
    };

    // forEach polyfill for IE8
    // http://stackoverflow.com/a/14827443/1077846
    /* eslint-disable */
    if (![].forEach) {
        Array.prototype.forEach = function(callback, thisArg) {
            for (var i = 0; i < this.length; i++) {
                callback.call(thisArg, this[i], i, this);
            }
        };
    }

    // filter polyfill for IE8
    // https://gist.github.com/eliperelman/1031656
    if (![].filter) {
        Array.prototype.filter = function(a, b, c, d, e) {
            c = this;
            d = [];
            for (e = 0; e < c.length; e++)
                a.call(b, c[e], e, c) && d.push(c[e]);
            return d;
        };
    }
    /* eslint-enable */

    // Script entry point
    function run(selector, userOptions) {
        // Fill supports object
        supports.transforms = testTransformsSupport();
        supports.svg = testSvgSupport();
        supports.passiveEvents = testPassiveEventsSupport();

        buildOverlay();
        removeFromCache(selector);
        return bindImageClickListeners(selector, userOptions);
    }

    function bindImageClickListeners(selector, userOptions) {
        // For each gallery bind a click event to every image inside it
        var galleryNodeList = document.querySelectorAll(selector);
        var selectorData = {
            galleries: [],
            nodeList: galleryNodeList
        };
        data[selector] = selectorData;

        [].forEach.call(galleryNodeList, function(galleryElement) {
            if (userOptions && userOptions.filter) {
                regex = userOptions.filter;
            }

            // Get nodes from gallery elements or single-element galleries
            var tagsNodeList = [];
            if (galleryElement.tagName === 'A') {
                tagsNodeList = [galleryElement];
            } else {
                tagsNodeList = galleryElement.getElementsByTagName('a');
            }

            // Filter 'a' elements from those not linking to images
            tagsNodeList = [].filter.call(tagsNodeList, function(element) {
                if (element.className.indexOf(userOptions && userOptions.ignoreClass) === -1) {
                    return regex.test(element.href);
                }
            });
            if (tagsNodeList.length === 0) {
                return;
            }

            var gallery = [];
            [].forEach.call(tagsNodeList, function(imageElement, imageIndex) {
                var imageElementClickHandler = function(event) {
                    event.preventDefault ? event.preventDefault() : event.returnValue = false; // eslint-disable-line no-unused-expressions
                    prepareOverlay(gallery, userOptions);
                    showOverlay(imageIndex);
                };
                var imageItem = {
                    eventHandler: imageElementClickHandler,
                    imageElement: imageElement
                };
                bind(imageElement, 'click', imageElementClickHandler);
                gallery.push(imageItem);
            });
            selectorData.galleries.push(gallery);
        });

        return selectorData.galleries;
    }

    function clearCachedData() {
        for (var selector in data) {
            if (data.hasOwnProperty(selector)) {
                removeFromCache(selector);
            }
        }
    }

    function removeFromCache(selector) {
        if (!data.hasOwnProperty(selector)) {
            return;
        }
        var galleries = data[selector].galleries;
        [].forEach.call(galleries, function(gallery) {
            [].forEach.call(gallery, function(imageItem) {
                unbind(imageItem.imageElement, 'click', imageItem.eventHandler);
            });

            if (currentGallery === gallery) {
                currentGallery = [];
            }
        });

        delete data[selector];
    }

    function buildOverlay() {
        overlay = getByID('baguetteBox-overlay');
        // Check if the overlay already exists
        if (overlay) {
            slider = getByID('baguetteBox-slider');
            previousButton = getByID('previous-button');
            nextButton = getByID('next-button');
            closeButton = getByID('close-button');
            return;
        }
        // Create overlay element
        overlay = create('div');
        overlay.setAttribute('role', 'dialog');
        overlay.id = 'baguetteBox-overlay';
        document.getElementsByTagName('body')[0].appendChild(overlay);
        // Create gallery slider element
        slider = create('div');
        slider.id = 'baguetteBox-slider';
        overlay.appendChild(slider);
        // Create all necessary buttons
        previousButton = create('button');
        previousButton.setAttribute('type', 'button');
        previousButton.id = 'previous-button';
        previousButton.setAttribute('aria-label', 'Previous');
        previousButton.innerHTML = supports.svg ? leftArrow : '&lt;';
        overlay.appendChild(previousButton);

        nextButton = create('button');
        nextButton.setAttribute('type', 'button');
        nextButton.id = 'next-button';
        nextButton.setAttribute('aria-label', 'Next');
        nextButton.innerHTML = supports.svg ? rightArrow : '&gt;';
        overlay.appendChild(nextButton);

        closeButton = create('button');
        closeButton.setAttribute('type', 'button');
        closeButton.id = 'close-button';
        closeButton.setAttribute('aria-label', 'Close');
        closeButton.innerHTML = supports.svg ? closeX : '&times;';
        overlay.appendChild(closeButton);

        previousButton.className = nextButton.className = closeButton.className = 'baguetteBox-button';

        bindEvents();
    }

    function keyDownHandler(event) {
        switch (event.keyCode) {
        case 37: // Left arrow
            showPreviousImage();
            break;
        case 39: // Right arrow
            showNextImage();
            break;
        case 27: // Esc
            hideOverlay();
            break;
        case 36: // Home
            showFirstImage(event);
            break;
        case 35: // End
            showLastImage(event);
            break;
        }
    }

    function bindEvents() {
        var passiveEvent = supports.passiveEvents ? { passive: false } : null;
        var nonPassiveEvent = supports.passiveEvents ? { passive: true } : null;

        bind(overlay, 'click', overlayClickHandler);
        bind(previousButton, 'click', previousButtonClickHandler);
        bind(nextButton, 'click', nextButtonClickHandler);
        bind(closeButton, 'click', closeButtonClickHandler);
        bind(slider, 'contextmenu', contextmenuHandler);
        bind(overlay, 'touchstart', touchstartHandler, nonPassiveEvent);
        bind(overlay, 'touchmove', touchmoveHandler, passiveEvent);
        bind(overlay, 'touchend', touchendHandler);
        bind(document, 'focus', trapFocusInsideOverlay, true);
    }

    function unbindEvents() {
        var passiveEvent = supports.passiveEvents ? { passive: false } : null;
        var nonPassiveEvent = supports.passiveEvents ? { passive: true } : null;

        unbind(overlay, 'click', overlayClickHandler);
        unbind(previousButton, 'click', previousButtonClickHandler);
        unbind(nextButton, 'click', nextButtonClickHandler);
        unbind(closeButton, 'click', closeButtonClickHandler);
        unbind(slider, 'contextmenu', contextmenuHandler);
        unbind(overlay, 'touchstart', touchstartHandler, nonPassiveEvent);
        unbind(overlay, 'touchmove', touchmoveHandler, passiveEvent);
        unbind(overlay, 'touchend', touchendHandler);
        unbind(document, 'focus', trapFocusInsideOverlay, true);
    }

    function prepareOverlay(gallery, userOptions) {
        // If the same gallery is being opened prevent from loading it once again
        if (currentGallery === gallery) {
            return;
        }
        currentGallery = gallery;
        // Update gallery specific options
        setOptions(userOptions);
        // Empty slider of previous contents (more effective than .innerHTML = "")
        while (slider.firstChild) {
            slider.removeChild(slider.firstChild);
        }
        imagesElements.length = 0;

        var imagesFiguresIds = [];
        var imagesCaptionsIds = [];
        // Prepare and append images containers and populate figure and captions IDs arrays
        for (var i = 0, fullImage; i < gallery.length; i++) {
            fullImage = create('div');
            fullImage.className = 'full-image';
            fullImage.id = 'baguette-img-' + i;
            imagesElements.push(fullImage);

            imagesFiguresIds.push('baguetteBox-figure-' + i);
            imagesCaptionsIds.push('baguetteBox-figcaption-' + i);
            slider.appendChild(imagesElements[i]);
        }
        overlay.setAttribute('aria-labelledby', imagesFiguresIds.join(' '));
        overlay.setAttribute('aria-describedby', imagesCaptionsIds.join(' '));
    }

    function setOptions(newOptions) {
        if (!newOptions) {
            newOptions = {};
        }
        // Fill options object
        for (var item in defaults) {
            options[item] = defaults[item];
            if (typeof newOptions[item] !== 'undefined') {
                options[item] = newOptions[item];
            }
        }
        /* Apply new options */
        // Change transition for proper animation
        slider.style.transition = slider.style.webkitTransition = (options.animation === 'fadeIn' ? 'opacity .4s ease' :
            options.animation === 'slideIn' ? '' : 'none');
        // Hide buttons if necessary
        if (options.buttons === 'auto' && ('ontouchstart' in window || currentGallery.length === 1)) {
            options.buttons = false;
        }
        // Set buttons style to hide or display them
        previousButton.style.display = nextButton.style.display = (options.buttons ? '' : 'none');
        // Set overlay color
        try {
            overlay.style.backgroundColor = options.overlayBackgroundColor;
        } catch (e) {
            // Silence the error and continue
        }
    }

    function showOverlay(chosenImageIndex) {
        if (options.noScrollbars) {
            document.documentElement.style.overflowY = 'hidden';
            document.body.style.overflowY = 'scroll';
        }
        if (overlay.style.display === 'block') {
            return;
        }

        bind(document, 'keydown', keyDownHandler);
        currentIndex = chosenImageIndex;
        touch = {
            count: 0,
            startX: null,
            startY: null
        };
        loadImage(currentIndex, function() {
            preloadNext(currentIndex);
            preloadPrev(currentIndex);
        });

        updateOffset();
        overlay.style.display = 'block';
        if (options.fullScreen) {
            enterFullScreen();
        }
        // Fade in overlay
        setTimeout(function() {
            overlay.className = 'visible';
            if (options.bodyClass && document.body.classList) {
                document.body.classList.add(options.bodyClass);
            }
            if (options.afterShow) {
                options.afterShow();
            }
        }, 50);
        if (options.onChange) {
            options.onChange(currentIndex, imagesElements.length);
        }
        documentLastFocus = document.activeElement;
        initFocus();
        isOverlayVisible = true;
    }

    function initFocus() {
        if (options.buttons) {
            previousButton.focus();
        } else {
            closeButton.focus();
        }
    }

    function enterFullScreen() {
        if (overlay.requestFullscreen) {
            overlay.requestFullscreen();
        } else if (overlay.webkitRequestFullscreen) {
            overlay.webkitRequestFullscreen();
        } else if (overlay.mozRequestFullScreen) {
            overlay.mozRequestFullScreen();
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }

    function hideOverlay() {
        if (options.noScrollbars) {
            document.documentElement.style.overflowY = 'auto';
            document.body.style.overflowY = 'auto';
        }
        if (overlay.style.display === 'none') {
            return;
        }

        unbind(document, 'keydown', keyDownHandler);
        // Fade out and hide the overlay
        overlay.className = '';
        setTimeout(function() {
            overlay.style.display = 'none';
            if (document.fullscreen) {
                exitFullscreen();
            }
            if (options.bodyClass && document.body.classList) {
                document.body.classList.remove(options.bodyClass);
            }
            if (options.afterHide) {
                options.afterHide();
            }
            documentLastFocus && documentLastFocus.focus();
            isOverlayVisible = false;
        }, 500);
    }

    function loadImage(index, callback) {
        var imageContainer = imagesElements[index];
        var galleryItem = currentGallery[index];

        // Return if the index exceeds prepared images in the overlay
        // or if the current gallery has been changed / closed
        if (typeof imageContainer === 'undefined' || typeof galleryItem === 'undefined') {
            return;
        }

        // If image is already loaded run callback and return
        if (imageContainer.getElementsByTagName('img')[0]) {
            if (callback) {
                callback();
            }
            return;
        }

        // Get element reference, optional caption and source path
        var imageElement = galleryItem.imageElement;
        var thumbnailElement = imageElement.getElementsByTagName('img')[0];
        var imageCaption = typeof options.captions === 'function' ?
            options.captions.call(currentGallery, imageElement) :
            imageElement.getAttribute('data-caption') || imageElement.title;
        var imageSrc = getImageSrc(imageElement);

        // Prepare figure element
        var figure = create('figure');
        figure.id = 'baguetteBox-figure-' + index;
        figure.innerHTML = '<div class="baguetteBox-spinner">' +
            '<div class="baguetteBox-double-bounce1"></div>' +
            '<div class="baguetteBox-double-bounce2"></div>' +
            '</div>';
        // Insert caption if available
        if (options.captions && imageCaption) {
            var figcaption = create('figcaption');
            figcaption.id = 'baguetteBox-figcaption-' + index;
            figcaption.innerHTML = imageCaption;
            figure.appendChild(figcaption);
        }
        imageContainer.appendChild(figure);

        // Prepare gallery img element
        var image = create('img');
        image.onload = function() {
            // Remove loader element
            var spinner = document.querySelector('#baguette-img-' + index + ' .baguetteBox-spinner');
            figure.removeChild(spinner);
            if (!options.async && callback) {
                callback();
            }
        };
        image.setAttribute('src', imageSrc);
        image.alt = thumbnailElement ? thumbnailElement.alt || '' : '';
        if (options.titleTag && imageCaption) {
            image.title = imageCaption;
        }
        figure.appendChild(image);

        // Run callback
        if (options.async && callback) {
            callback();
        }
    }

    // Get image source location, mostly used for responsive images
    function getImageSrc(image) {
        // Set default image path from href
        var result = image.href;
        // If dataset is supported find the most suitable image
        if (image.dataset) {
            var srcs = [];
            // Get all possible image versions depending on the resolution
            for (var item in image.dataset) {
                if (item.substring(0, 3) === 'at-' && !isNaN(item.substring(3))) {
                    srcs[item.replace('at-', '')] = image.dataset[item];
                }
            }
            // Sort resolutions ascending
            var keys = Object.keys(srcs).sort(function(a, b) {
                return parseInt(a, 10) < parseInt(b, 10) ? -1 : 1;
            });
            // Get real screen resolution
            var width = window.innerWidth * window.devicePixelRatio;
            // Find the first image bigger than or equal to the current width
            var i = 0;
            while (i < keys.length - 1 && keys[i] < width) {
                i++;
            }
            result = srcs[keys[i]] || result;
        }
        return result;
    }

    // Return false at the right end of the gallery
    function showNextImage() {
        return show(currentIndex + 1);
    }

    // Return false at the left end of the gallery
    function showPreviousImage() {
        return show(currentIndex - 1);
    }

    // Return false at the left end of the gallery
    function showFirstImage(event) {
        if (event) {
            event.preventDefault();
        }
        return show(0);
    }

    // Return false at the right end of the gallery
    function showLastImage(event) {
        if (event) {
            event.preventDefault();
        }
        return show(currentGallery.length - 1);
    }

    /**
     * Move the gallery to a specific index
     * @param `index` {number} - the position of the image
     * @param `gallery` {array} - gallery which should be opened, if omitted assumes the currently opened one
     * @return {boolean} - true on success or false if the index is invalid
     */
    function show(index, gallery) {
        if (!isOverlayVisible && index >= 0 && index < gallery.length) {
            prepareOverlay(gallery, options);
            showOverlay(index);
            return true;
        }
        if (index < 0) {
            if (options.animation) {
                bounceAnimation('left');
            }
            return false;
        }
        if (index >= imagesElements.length) {
            if (options.animation) {
                bounceAnimation('right');
            }
            return false;
        }

        currentIndex = index;
        loadImage(currentIndex, function() {
            preloadNext(currentIndex);
            preloadPrev(currentIndex);
        });
        updateOffset();

        if (options.onChange) {
            options.onChange(currentIndex, imagesElements.length);
        }

        return true;
    }

    /**
     * Triggers the bounce animation
     * @param {('left'|'right')} direction - Direction of the movement
     */
    function bounceAnimation(direction) {
        slider.className = 'bounce-from-' + direction;
        setTimeout(function() {
            slider.className = '';
        }, 400);
    }

    function updateOffset() {
        var offset = -currentIndex * 100 + '%';
        if (options.animation === 'fadeIn') {
            slider.style.opacity = 0;
            setTimeout(function() {
                supports.transforms ?
                    slider.style.transform = slider.style.webkitTransform = 'translate3d(' + offset + ',0,0)'
                    : slider.style.left = offset;
                slider.style.opacity = 1;
            }, 400);
        } else {
            supports.transforms ?
                slider.style.transform = slider.style.webkitTransform = 'translate3d(' + offset + ',0,0)'
                : slider.style.left = offset;
        }
    }

    // CSS 3D Transforms test
    function testTransformsSupport() {
        var div = create('div');
        return typeof div.style.perspective !== 'undefined' || typeof div.style.webkitPerspective !== 'undefined';
    }

    // Inline SVG test
    function testSvgSupport() {
        var div = create('div');
        div.innerHTML = '<svg/>';
        return (div.firstChild && div.firstChild.namespaceURI) === 'http://www.w3.org/2000/svg';
    }

    // Borrowed from https://github.com/seiyria/bootstrap-slider/pull/680/files
    /* eslint-disable getter-return */
    function testPassiveEventsSupport() {
        var passiveEvents = false;
        try {
            var opts = Object.defineProperty({}, 'passive', {
                get: function() {
                    passiveEvents = true;
                }
            });
            window.addEventListener('test', null, opts);
        } catch (e) { /* Silence the error and continue */ }

        return passiveEvents;
    }
    /* eslint-enable getter-return */

    function preloadNext(index) {
        if (index - currentIndex >= options.preload) {
            return;
        }
        loadImage(index + 1, function() {
            preloadNext(index + 1);
        });
    }

    function preloadPrev(index) {
        if (currentIndex - index >= options.preload) {
            return;
        }
        loadImage(index - 1, function() {
            preloadPrev(index - 1);
        });
    }

    function bind(element, event, callback, options) {
        if (element.addEventListener) {
            element.addEventListener(event, callback, options);
        } else {
            // IE8 fallback
            element.attachEvent('on' + event, function(event) {
                // `event` and `event.target` are not provided in IE8
                event = event || window.event;
                event.target = event.target || event.srcElement;
                callback(event);
            });
        }
    }

    function unbind(element, event, callback, options) {
        if (element.removeEventListener) {
            element.removeEventListener(event, callback, options);
        } else {
            // IE8 fallback
            element.detachEvent('on' + event, callback);
        }
    }

    function getByID(id) {
        return document.getElementById(id);
    }

    function create(element) {
        return document.createElement(element);
    }

    function destroyPlugin() {
        unbindEvents();
        clearCachedData();
        unbind(document, 'keydown', keyDownHandler);
        document.getElementsByTagName('body')[0].removeChild(document.getElementById('baguetteBox-overlay'));
        data = {};
        currentGallery = [];
        currentIndex = 0;
    }

    return {
        run: run,
        show: show,
        showNext: showNextImage,
        showPrevious: showPreviousImage,
        hide: hideOverlay,
        destroy: destroyPlugin
    };
}));
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).MicroModal=t()}(this,(function(){"use strict";function e(e,t){for(var o=0;o<t.length;o++){var n=t[o];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}function t(e){return function(e){if(Array.isArray(e))return o(e)}(e)||function(e){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(e))return Array.from(e)}(e)||function(e,t){if(!e)return;if("string"==typeof e)return o(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);"Object"===n&&e.constructor&&(n=e.constructor.name);if("Map"===n||"Set"===n)return Array.from(e);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return o(e,t)}(e)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function o(e,t){(null==t||t>e.length)&&(t=e.length);for(var o=0,n=new Array(t);o<t;o++)n[o]=e[o];return n}var n,i,a,r,s,l=(n=["a[href]","area[href]",'input:not([disabled]):not([type="hidden"]):not([aria-hidden])',"select:not([disabled]):not([aria-hidden])","textarea:not([disabled]):not([aria-hidden])","button:not([disabled]):not([aria-hidden])","iframe","object","embed","[contenteditable]",'[tabindex]:not([tabindex^="-"])'],i=function(){function o(e){var n=e.targetModal,i=e.triggers,a=void 0===i?[]:i,r=e.onShow,s=void 0===r?function(){}:r,l=e.onClose,c=void 0===l?function(){}:l,d=e.openTrigger,u=void 0===d?"data-micromodal-trigger":d,f=e.closeTrigger,h=void 0===f?"data-micromodal-close":f,v=e.openClass,g=void 0===v?"is-open":v,m=e.disableScroll,b=void 0!==m&&m,y=e.disableFocus,p=void 0!==y&&y,w=e.awaitCloseAnimation,E=void 0!==w&&w,k=e.awaitOpenAnimation,M=void 0!==k&&k,A=e.debugMode,C=void 0!==A&&A;!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,o),this.modal=document.getElementById(n),this.config={debugMode:C,disableScroll:b,openTrigger:u,closeTrigger:h,openClass:g,onShow:s,onClose:c,awaitCloseAnimation:E,awaitOpenAnimation:M,disableFocus:p},a.length>0&&this.registerTriggers.apply(this,t(a)),this.onClick=this.onClick.bind(this),this.onKeydown=this.onKeydown.bind(this)}var i,a,r;return i=o,(a=[{key:"registerTriggers",value:function(){for(var e=this,t=arguments.length,o=new Array(t),n=0;n<t;n++)o[n]=arguments[n];o.filter(Boolean).forEach((function(t){t.addEventListener("click",(function(t){return e.showModal(t)}))}))}},{key:"showModal",value:function(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:null;if(this.activeElement=document.activeElement,this.modal.setAttribute("aria-hidden","false"),this.modal.classList.add(this.config.openClass),this.scrollBehaviour("disable"),this.addEventListeners(),this.config.awaitOpenAnimation){var o=function t(){e.modal.removeEventListener("animationend",t,!1),e.setFocusToFirstNode()};this.modal.addEventListener("animationend",o,!1)}else this.setFocusToFirstNode();this.config.onShow(this.modal,this.activeElement,t)}},{key:"closeModal",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:null,t=this.modal;if(this.modal.setAttribute("aria-hidden","true"),this.removeEventListeners(),this.scrollBehaviour("enable"),this.activeElement&&this.activeElement.focus&&this.activeElement.focus(),this.config.onClose(this.modal,this.activeElement,e),this.config.awaitCloseAnimation){var o=this.config.openClass;this.modal.addEventListener("animationend",(function e(){t.classList.remove(o),t.removeEventListener("animationend",e,!1)}),!1)}else t.classList.remove(this.config.openClass)}},{key:"closeModalById",value:function(e){this.modal=document.getElementById(e),this.modal&&this.closeModal()}},{key:"scrollBehaviour",value:function(e){if(this.config.disableScroll){var t=document.querySelector("body");switch(e){case"enable":Object.assign(t.style,{overflow:""});break;case"disable":Object.assign(t.style,{overflow:"hidden"})}}}},{key:"addEventListeners",value:function(){this.modal.addEventListener("touchstart",this.onClick),this.modal.addEventListener("click",this.onClick),document.addEventListener("keydown",this.onKeydown)}},{key:"removeEventListeners",value:function(){this.modal.removeEventListener("touchstart",this.onClick),this.modal.removeEventListener("click",this.onClick),document.removeEventListener("keydown",this.onKeydown)}},{key:"onClick",value:function(e){(e.target.hasAttribute(this.config.closeTrigger)||e.target.parentNode.hasAttribute(this.config.closeTrigger))&&(e.preventDefault(),e.stopPropagation(),this.closeModal(e))}},{key:"onKeydown",value:function(e){27===e.keyCode&&this.closeModal(e),9===e.keyCode&&this.retainFocus(e)}},{key:"getFocusableNodes",value:function(){var e=this.modal.querySelectorAll(n);return Array.apply(void 0,t(e))}},{key:"setFocusToFirstNode",value:function(){var e=this;if(!this.config.disableFocus){var t=this.getFocusableNodes();if(0!==t.length){var o=t.filter((function(t){return!t.hasAttribute(e.config.closeTrigger)}));o.length>0&&o[0].focus(),0===o.length&&t[0].focus()}}}},{key:"retainFocus",value:function(e){var t=this.getFocusableNodes();if(0!==t.length)if(t=t.filter((function(e){return null!==e.offsetParent})),this.modal.contains(document.activeElement)){var o=t.indexOf(document.activeElement);e.shiftKey&&0===o&&(t[t.length-1].focus(),e.preventDefault()),!e.shiftKey&&t.length>0&&o===t.length-1&&(t[0].focus(),e.preventDefault())}else t[0].focus()}}])&&e(i.prototype,a),r&&e(i,r),o}(),a=null,r=function(e){if(!document.getElementById(e))return console.warn("MicroModal: ❗Seems like you have missed %c'".concat(e,"'"),"background-color: #f8f9fa;color: #50596c;font-weight: bold;","ID somewhere in your code. Refer example below to resolve it."),console.warn("%cExample:","background-color: #f8f9fa;color: #50596c;font-weight: bold;",'<div class="modal" id="'.concat(e,'"></div>')),!1},s=function(e,t){if(function(e){e.length<=0&&(console.warn("MicroModal: ❗Please specify at least one %c'micromodal-trigger'","background-color: #f8f9fa;color: #50596c;font-weight: bold;","data attribute."),console.warn("%cExample:","background-color: #f8f9fa;color: #50596c;font-weight: bold;",'<a href="#" data-micromodal-trigger="my-modal"></a>'))}(e),!t)return!0;for(var o in t)r(o);return!0},{init:function(e){var o=Object.assign({},{openTrigger:"data-micromodal-trigger"},e),n=t(document.querySelectorAll("[".concat(o.openTrigger,"]"))),r=function(e,t){var o=[];return e.forEach((function(e){var n=e.attributes[t].value;void 0===o[n]&&(o[n]=[]),o[n].push(e)})),o}(n,o.openTrigger);if(!0!==o.debugMode||!1!==s(n,r))for(var l in r){var c=r[l];o.targetModal=l,o.triggers=t(c),a=new i(o)}},show:function(e,t){var o=t||{};o.targetModal=e,!0===o.debugMode&&!1===r(e)||(a&&a.removeEventListeners(),(a=new i(o)).showModal())},close:function(e){e?a.closeModalById(e):a.closeModal()}});return"undefined"!=typeof window&&(window.MicroModal=l),l}));
/*https://github.com/willbamford/tinycrop*/
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["tinycrop"] = factory();
	else
		root["tinycrop"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _debounce = __webpack_require__(8);

	var _debounce2 = _interopRequireDefault(_debounce);

	var _BackgroundLayer = __webpack_require__(3);

	var _BackgroundLayer2 = _interopRequireDefault(_BackgroundLayer);

	var _ImageLayer = __webpack_require__(5);

	var _ImageLayer2 = _interopRequireDefault(_ImageLayer);

	var _SelectionLayer = __webpack_require__(7);

	var _SelectionLayer2 = _interopRequireDefault(_SelectionLayer);

	var _Image = __webpack_require__(4);

	var _Image2 = _interopRequireDefault(_Image);

	var _Listeners = __webpack_require__(1);

	var _Listeners2 = _interopRequireDefault(_Listeners);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var DEFAULT_CANVAS_WIDTH = 400;
	var DEFAULT_CANVAS_HEIGHT = 300;

	var Crop = function () {
	  function Crop(opts) {
	    _classCallCheck(this, Crop);

	    this.parent = typeof opts.parent === 'string' ? document.querySelector(opts.parent) : opts.parent;

	    this.canvas = document.createElement('canvas');
	    this.context = this.canvas.getContext('2d');
	    this.boundsOpts = opts.bounds || { width: '100%', height: 'auto' };
	    opts.selection = opts.selection || {};
	    this.debounceResize = opts.debounceResize !== undefined ? opts.debounceResize : true;
	    this.listeners = _Listeners2.default.create();

	    this.parent.appendChild(this.canvas);

	    this.backgroundLayer = _BackgroundLayer2.default.create({
	      parent: this,
	      context: this.context,
	      colors: opts.backgroundColors || ['#fff', '#f0f0f0']
	    });

	    this.imageLayer = _ImageLayer2.default.create({
	      parent: this,
	      context: this.context,
	      image: this.image
	    });

	    this.selectionLayer = _SelectionLayer2.default.create({
	      parent: this,
	      context: this.context,
	      target: this.imageLayer,
	      aspectRatio: opts.selection.aspectRatio,
	      minWidth: opts.selection.minWidth,
	      minHeight: opts.selection.minHeight,
	      x: opts.selection.x,
	      y: opts.selection.y,
	      width: opts.selection.width,
	      height: opts.selection.height,
	      handle: {
	        color: opts.selection.color,
	        activeColor: opts.selection.activeColor
	      }
	    });

	    var listeners = this.listeners;
	    var paint = this.paint.bind(this);

	    this.selectionLayer.on('start', function (region) {
	      paint();
	      listeners.notify('start', region);
	    }).on('move', function (region) {
	      listeners.notify('move', region);
	    }).on('resize', function (region) {
	      listeners.notify('resize', region);
	    }).on('change', function (region) {
	      paint();
	      listeners.notify('change', region);
	    }).on('end', function (region) {
	      paint();
	      listeners.notify('end', region);
	    });

	    window.addEventListener('resize', this.debounceResize ? (0, _debounce2.default)(this.revalidateAndPaint.bind(this), 100) : this.revalidateAndPaint.bind(this));

	    this.setImage(opts.image, opts.onInit);

	    this.revalidateAndPaint();
	  }

	  _createClass(Crop, [{
	    key: 'on',
	    value: function on(type, fn) {
	      this.listeners.on(type, fn);
	      return this;
	    }
	  }, {
	    key: 'off',
	    value: function off(type, fn) {
	      this.listeners.off(type, fn);
	      return this;
	    }
	  }, {
	    key: 'revalidateAndPaint',
	    value: function revalidateAndPaint() {
	      this.revalidate();
	      this.paint();
	    }
	  }, {
	    key: 'revalidate',
	    value: function revalidate() {
	      var parent = this.parent;
	      var image = this.image;

	      var boundsWidth = this.boundsOpts.width;
	      var boundsHeight = this.boundsOpts.height;
	      var width = 0;
	      var height = 0;

	      if (isInteger(boundsWidth)) {
	        width = boundsWidth;
	      } else if (parent && isPercent(boundsWidth)) {
	        width = Math.round(parent.clientWidth * getPercent(boundsWidth) / 100);
	      } else {
	        width = DEFAULT_CANVAS_WIDTH;
	      }

	      if (isInteger(boundsHeight)) {
	        height = boundsHeight;
	      } else if (isPercent(boundsHeight)) {
	        height = Math.round(width * getPercent(boundsHeight) / 100);
	      } else if (image && image.hasLoaded && isAuto(boundsHeight)) {
	        height = Math.floor(width / image.getAspectRatio());
	      } else {
	        height = DEFAULT_CANVAS_HEIGHT;
	      }

	      this.resizeCanvas(width, height);

	      this.backgroundLayer.revalidate();
	      this.imageLayer.revalidate();
	      this.selectionLayer.revalidate();
	    }
	  }, {
	    key: 'paint',
	    value: function paint() {
	      var g = this.context;

	      g.save();
	      g.scale(this.ratio, this.ratio);

	      this.backgroundLayer.paint();

	      if (this.image && this.image.hasLoaded) {
	        this.imageLayer.paint();
	        this.selectionLayer.paint();
	      }

	      g.restore();
	    }
	  }, {
	    key: 'resizeCanvas',
	    value: function resizeCanvas(width, height) {
	      var canvas = this.canvas;
	      this.ratio = window.devicePixelRatio || 1;
	      this.width = width;
	      this.height = height;
	      canvas.width = this.width * this.ratio;
	      canvas.height = this.height * this.ratio;
	    }
	  }, {
	    key: 'setImage',
	    value: function setImage(source, onLoad) {
	      var _this = this;

	      var image = _Image2.default.create(source).on('load', function () {
	        _this.selectionLayer.onImageLoad();
	        _this.revalidateAndPaint();
	        onLoad && onLoad();
	      }).on('error', function (e) {
	        console.error(e);
	      });

	      this.imageLayer.setImage(image);
	      this.image = image;
	      this.revalidateAndPaint();
	    }
	  }, {
	    key: 'getImage',
	    value: function getImage() {
	      return this.image;
	    }
	  }, {
	    key: 'setAspectRatio',
	    value: function setAspectRatio(aspectRatio) {
	      this.selectionLayer.setAspectRatio(aspectRatio);
	      this.revalidateAndPaint();
	    }
	  }, {
	    key: 'setBounds',
	    value: function setBounds(opts) {
	      this.boundsOpts = opts;
	      this.revalidateAndPaint();
	    }
	  }, {
	    key: 'setBackgroundColors',
	    value: function setBackgroundColors(colors) {
	      this.backgroundLayer.setColors(colors);
	      this.revalidateAndPaint();
	    }
	  }]);

	  return Crop;
	}();

	Crop.create = function (opts) {
	  return new Crop(opts);
	};

	Crop.prototype.dispose = noop;

	function noop() {}

	function isPercent(v) {
	  if (typeof v !== 'string') {
	    return false;
	  }

	  if (v.length < 1) {
	    return false;
	  }

	  if (v[v.length - 1] === '%') {
	    return true;
	  }
	}

	function getPercent(v) {
	  if (!isPercent(v)) {
	    return 0;
	  }

	  return v.slice(0, -1);
	}

	function isAuto(v) {
	  return v === 'auto';
	}

	function isInteger(v) {
	  return typeof v === 'number' && Math.round(v) === v;
	}

	module.exports = Crop;

/***/ },
/* 1 */
/***/ function(module, exports) {

	"use strict";

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Listeners = function () {
	  function Listeners(opts) {
	    _classCallCheck(this, Listeners);

	    this.events = {};
	  }

	  _createClass(Listeners, [{
	    key: "on",
	    value: function on(type, fn) {
	      if (!this.events[type]) {
	        this.events[type] = [];
	      }

	      if (this.events[type].indexOf(fn) === -1) {
	        this.events[type].push(fn);
	      }

	      return this;
	    }
	  }, {
	    key: "off",
	    value: function off(type, fn) {
	      if (this.events[type]) {
	        var i = this.events[type].indexOf(fn);
	        if (i !== -1) {
	          this.events[type].splice(i, 1);
	        }
	      }

	      return this;
	    }
	  }, {
	    key: "notify",
	    value: function notify(type, data) {
	      var _this = this;

	      if (this.events[type]) {
	        this.events[type].forEach(function (fn) {
	          fn.call(_this, data);
	        });
	      }
	    }
	  }, {
	    key: "clearAll",
	    value: function clearAll() {
	      this.events = {};
	    }
	  }]);

	  return Listeners;
	}();

	Listeners.create = function (opts) {
	  return new Listeners(opts);
	};

	exports.default = Listeners;

/***/ },
/* 2 */
/***/ function(module, exports) {

	"use strict";

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Rectangle = function () {
	  function Rectangle(x, y, width, height) {
	    _classCallCheck(this, Rectangle);

	    this._x = x;
	    this._y = y;
	    this._width = width;
	    this._height = height;
	  }

	  _createClass(Rectangle, [{
	    key: "copy",
	    value: function copy(_copy) {
	      this._x = _copy.x;
	      this._y = _copy.y;
	      this._width = _copy.width;
	      this._height = _copy.height;
	      return this;
	    }
	  }, {
	    key: "clone",
	    value: function clone() {
	      return Rectangle.create(this._x, this._y, this._width, this._height);
	    }
	  }, {
	    key: "round",
	    value: function round() {
	      var dx = this._x;
	      var dy = this._y;
	      this._x = Math.round(dx);
	      this._y = Math.round(dy);
	      dx -= this._x;
	      dy -= this._y;
	      this._width = Math.round(this._width + dx);
	      this._height = Math.round(this._height + dy);
	      return this;
	    }
	  }, {
	    key: "isInside",
	    value: function isInside(point) {
	      return point.x >= this.left && point.y >= this.top && point.x < this.right && point.y < this.bottom;
	    }
	  }]);

	  return Rectangle;
	}();

	Object.defineProperties(Rectangle.prototype, {
	  x: {
	    get: function get() {
	      return this._x;
	    },
	    set: function set(v) {
	      this._x = v;
	    }
	  },
	  y: {
	    get: function get() {
	      return this._y;
	    },
	    set: function set(v) {
	      this._y = v;
	    }
	  },
	  centerX: {
	    get: function get() {
	      return this._x + this._width * 0.5;
	    },
	    set: function set(v) {
	      this._x = v - this._width * 0.5;
	    }
	  },
	  centerY: {
	    get: function get() {
	      return this._y + this._height * 0.5;
	    },
	    set: function set(v) {
	      this._y = v - this._height * 0.5;
	    }
	  },
	  width: {
	    get: function get() {
	      return this._width;
	    },
	    set: function set(v) {
	      this._width = v;
	    }
	  },
	  height: {
	    get: function get() {
	      return this._height;
	    },
	    set: function set(v) {
	      this._height = v;
	    }
	  },
	  left: {
	    get: function get() {
	      return this._x;
	    },
	    set: function set(v) {
	      this._width = this._x + this._width - v;
	      this._x = v;
	    }
	  },
	  top: {
	    get: function get() {
	      return this._y;
	    },
	    set: function set(v) {
	      this._height = this._y + this._height - v;
	      this._y = v;
	    }
	  },
	  right: {
	    get: function get() {
	      return this._x + this._width;
	    },
	    set: function set(v) {
	      this._width = v - this._x;
	    }
	  },
	  bottom: {
	    get: function get() {
	      return this._y + this._height;
	    },
	    set: function set(v) {
	      this._height = v - this._y;
	    }
	  },
	  aspectRatio: {
	    get: function get() {
	      return this._width / this._height;
	    }
	  }
	});

	Rectangle.create = function (x, y, width, height) {
	  return new Rectangle(x, y, width, height);
	};

	exports.default = Rectangle;

/***/ },
/* 3 */
/***/ function(module, exports) {

	"use strict";

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var BackgroundLayer = function () {
	  function BackgroundLayer() {
	    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck(this, BackgroundLayer);

	    this.colors = opts.colors;
	    this.parent = opts.parent;
	    this.context = opts.context;
	    this.isDirty = true;
	  }

	  _createClass(BackgroundLayer, [{
	    key: "revalidate",
	    value: function revalidate() {
	      this.isDirty = true;
	    }
	  }, {
	    key: "setColors",
	    value: function setColors(colors) {
	      this.colors = colors;
	    }
	  }, {
	    key: "paint",
	    value: function paint() {
	      if (this.isDirty) {
	        var parent = this.parent;
	        var g = this.context;

	        if (!this.colors || !this.colors.length) {
	          g.clearRect(0, 0, parent.width, parent.height);
	        } else {
	          g.fillStyle = this.colors[0];
	          g.fillRect(0, 0, parent.width, parent.height);
	        }

	        if (this.colors && this.colors.length > 1) {
	          var h = parent.height;

	          var cols = 32;
	          var size = parent.width / cols;
	          var rows = Math.ceil(h / size);

	          g.fillStyle = this.colors[1];
	          for (var i = 0; i < cols; i += 1) {
	            for (var j = 0; j < rows; j += 1) {
	              if ((i + j) % 2 === 0) {
	                g.fillRect(i * size, j * size, size, size);
	              }
	            }
	          }
	        }

	        this.isDirty = false;
	      }
	    }
	  }]);

	  return BackgroundLayer;
	}();

	BackgroundLayer.create = function (opts) {
	  return new BackgroundLayer(opts);
	};

	exports.default = BackgroundLayer;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _loadImage = __webpack_require__(9);

	var _loadImage2 = _interopRequireDefault(_loadImage);

	var _Listeners = __webpack_require__(1);

	var _Listeners2 = _interopRequireDefault(_Listeners);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Image = function () {
	  function Image(source) {
	    var _this = this;

	    _classCallCheck(this, Image);

	    this.width = 0;
	    this.height = 0;

	    this.hasLoaded = false;
	    this.src = null;

	    this.listeners = _Listeners2.default.create();

	    if (!source) {
	      return;
	    }

	    if (typeof source === 'string') {
	      this.src = source;
	      var img = document.createElement('img');
	      img.src = this.src;
	      source = img;
	    } else {
	      this.src = source.src;
	    }

	    this.source = source;

	    (0, _loadImage2.default)(source, function (err) {
	      if (err) {
	        _this.notify('error', err);
	      } else {
	        _this.hasLoaded = true;
	        _this.width = source.naturalWidth;
	        _this.height = source.naturalHeight;
	        _this.notify('load', _this);
	      }
	    });
	  }

	  _createClass(Image, [{
	    key: 'getAspectRatio',
	    value: function getAspectRatio() {
	      if (!this.hasLoaded) {
	        return 1;
	      }

	      return this.width / this.height;
	    }
	  }, {
	    key: 'notify',
	    value: function notify(type, data) {
	      var listeners = this.listeners;
	      setTimeout(function () {
	        listeners.notify(type, data);
	      }, 0);
	    }
	  }, {
	    key: 'on',
	    value: function on(type, fn) {
	      this.listeners.on(type, fn);
	      return this;
	    }
	  }, {
	    key: 'off',
	    value: function off(type, fn) {
	      this.listeners.off(type, fn);
	      return this;
	    }
	  }]);

	  return Image;
	}();

	Image.create = function (source) {
	  return new Image(source);
	};

	exports.default = Image;

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _Rectangle = __webpack_require__(2);

	var _Rectangle2 = _interopRequireDefault(_Rectangle);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var ImageLayer = function () {
	  function ImageLayer() {
	    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck(this, ImageLayer);

	    this.bounds = _Rectangle2.default.create(0, 0, 0, 0);
	    this.image = opts.image || null;
	    this.parent = opts.parent;
	    this.context = opts.context;
	  }

	  _createClass(ImageLayer, [{
	    key: 'setImage',
	    value: function setImage(image) {
	      this.image = image;
	    }
	  }, {
	    key: 'revalidate',
	    value: function revalidate() {
	      var parent = this.parent;
	      var image = this.image;
	      var bounds = this.bounds;

	      if (image) {
	        // Constrained by width (otherwise height)
	        if (image.width / image.height >= parent.width / parent.height) {
	          bounds.width = parent.width;
	          bounds.height = Math.ceil(image.height / image.width * parent.width);
	          bounds.x = 0;
	          bounds.y = Math.floor((parent.height - bounds.height) * 0.5);
	        } else {
	          bounds.width = Math.ceil(image.width / image.height * parent.height);
	          bounds.height = parent.height;
	          bounds.x = Math.floor((parent.width - bounds.width) * 0.5);
	          bounds.y = 0;
	        }
	      }
	    }
	  }, {
	    key: 'paint',
	    value: function paint() {
	      var g = this.context;
	      var image = this.image;
	      var bounds = this.bounds;

	      if (image && image.hasLoaded) {
	        g.drawImage(image.source, 0, 0, image.width, image.height, bounds.x, bounds.y, bounds.width, bounds.height);
	      }
	    }
	  }]);

	  return ImageLayer;
	}();

	ImageLayer.create = function (opts) {
	  return new ImageLayer(opts);
	};

	exports.default = ImageLayer;

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _Rectangle = __webpack_require__(2);

	var _Rectangle2 = _interopRequireDefault(_Rectangle);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Selection = function () {
	  function Selection(opts) {
	    _classCallCheck(this, Selection);

	    this.target = opts.target || null;
	    this.bounds = _Rectangle2.default.create(0, 0, 0, 0);
	    this.boundsPx = _Rectangle2.default.create(0, 0, 0, 0);
	    this.region = _Rectangle2.default.create(0, 0, 0, 0);

	    this.initialOpts = {
	      x: opts.x,
	      y: opts.y,
	      width: opts.width,
	      height: opts.height
	    };

	    this.aspectRatio = opts.aspectRatio;
	    this.minWidth = opts.minWidth !== undefined ? opts.minWidth : 100;
	    this.minHeight = opts.minHeight !== undefined ? opts.minHeight : 100;

	    this.boundsMinWidth = 0;
	    this.boundsMinHeight = 0;

	    this._delta = { x: 0, h: 0 };
	  }

	  _createClass(Selection, [{
	    key: 'getBoundsLengthForRegion',
	    value: function getBoundsLengthForRegion(regionLen) {
	      return regionLen / this.region.width * this.width;
	    }
	  }, {
	    key: 'moveBy',
	    value: function moveBy(dx, dy) {
	      var bounds = this.bounds;
	      var target = this.target;

	      bounds.x = Math.min(Math.max(bounds.x + dx, target.bounds.x), target.bounds.x + target.bounds.width - bounds.width);
	      bounds.y = Math.min(Math.max(bounds.y + dy, target.bounds.y), target.bounds.y + target.bounds.height - bounds.height);

	      return this.updateRegionFromBounds();
	    }
	  }, {
	    key: 'resizeBy',
	    value: function resizeBy(dx, dy, p) {
	      var delta = this._delta;
	      var aspectRatio = this.aspectRatio;
	      var bounds = this.bounds;
	      var boundsMinWidth = this.boundsMinWidth;
	      var boundsMinHeight = this.boundsMinHeight;
	      var target = this.target;

	      function calculateDelta(x, y) {
	        delta.width = bounds.width + x;
	        delta.height = bounds.height + y;

	        delta.width = Math.max(boundsMinWidth, delta.width);
	        delta.height = Math.max(boundsMinHeight, delta.height);

	        if (aspectRatio) {
	          if (delta.width / delta.height > aspectRatio) {
	            delta.width = delta.height * aspectRatio;
	          } else {
	            delta.height = delta.width / aspectRatio;
	          }
	        }

	        delta.width -= bounds.width;
	        delta.height -= bounds.height;

	        return delta;
	      }

	      if (p[0] === 'n') {
	        dy = Math.min(dy, this.top - target.bounds.top);
	      } else if (p[0] === 's') {
	        dy = Math.min(dy, target.bounds.bottom - this.bottom);
	      }

	      if (p[1] === 'w') {
	        dx = Math.min(dx, this.left - target.bounds.left);
	      } else if (p[1] === 'e') {
	        dx = Math.min(dx, target.bounds.right - this.right);
	      }

	      delta = calculateDelta(dx, dy);

	      switch (p) {
	        case 'nw':
	          this.left -= delta.width;
	          this.top -= delta.height;
	          break;
	        case 'ne':
	          this.right += delta.width;
	          this.top -= delta.height;
	          break;
	        case 'sw':
	          this.left -= delta.width;
	          this.bottom += delta.height;
	          break;
	        case 'se':
	          this.right += delta.width;
	          this.bottom += delta.height;
	          break;
	      }

	      return this.updateRegionFromBounds();
	    }
	  }, {
	    key: 'autoSizeRegion',
	    value: function autoSizeRegion() {
	      var target = this.target;
	      var region = this.region;
	      var aspectRatio = this.aspectRatio;
	      var initialOpts = this.initialOpts;
	      var beforeX = region.x;
	      var beforeY = region.y;
	      var beforeWidth = region.width;
	      var beforeHeight = region.height;

	      region.x = initialOpts.x !== undefined ? initialOpts.x : 0;
	      region.y = initialOpts.y !== undefined ? initialOpts.y : 0;

	      region.width = initialOpts.width !== undefined ? initialOpts.width : target.image.width;
	      region.height = initialOpts.height !== undefined ? initialOpts.height : target.image.height;

	      if (aspectRatio) {
	        if (region.width / region.height > aspectRatio) {
	          region.width = region.height * aspectRatio;
	        } else {
	          region.height = region.width / aspectRatio;
	        }
	      }

	      if (initialOpts.x === undefined) {
	        region.centerX = target.image.width * 0.5;
	      }

	      if (initialOpts.y === undefined) {
	        region.centerY = target.image.height * 0.5;
	      }

	      region.round();

	      this.updateBoundsFromRegion();

	      return region.x !== beforeX || region.y !== beforeY || region.width !== beforeWidth || region.height !== beforeHeight;
	    }
	  }, {
	    key: 'updateRegionFromBounds',
	    value: function updateRegionFromBounds() {
	      var target = this.target;
	      var region = this.region;
	      var bounds = this.bounds;
	      var beforeX = region.x;
	      var beforeY = region.y;
	      var beforeWidth = region.width;
	      var beforeHeight = region.height;

	      region.x = target.image.width * (bounds.x - target.bounds.x) / target.bounds.width;
	      region.y = target.image.height * (bounds.y - target.bounds.y) / target.bounds.height;

	      region.width = target.image.width * (bounds.width / target.bounds.width);
	      region.height = target.image.height * (bounds.height / target.bounds.height);

	      region.round();

	      return region.x !== beforeX || region.y !== beforeY || region.width !== beforeWidth || region.height !== beforeHeight;
	    }
	  }, {
	    key: 'updateBoundsFromRegion',
	    value: function updateBoundsFromRegion() {
	      var target = this.target;
	      var region = this.region;
	      var bounds = this.bounds;

	      if (target.image) {
	        bounds.x = target.bounds.x + target.bounds.width * (region.x / target.image.width);
	        bounds.y = target.bounds.y + target.bounds.height * (region.y / target.image.height);
	        bounds.width = target.bounds.width * (region.width / target.image.width);
	        bounds.height = target.bounds.height * (region.height / target.image.height);
	      }

	      this.boundsMinWidth = this.getBoundsLengthForRegion(this.minWidth);
	      this.boundsMinHeight = this.getBoundsLengthForRegion(this.minHeight);
	    }
	  }, {
	    key: 'isInside',
	    value: function isInside(point) {
	      return this.bounds.isInside(point);
	    }
	  }]);

	  return Selection;
	}();

	Object.defineProperties(Selection.prototype, {
	  x: {
	    get: function get() {
	      return this.bounds.x;
	    },
	    set: function set(v) {
	      this.bounds.x = v;
	    }
	  },
	  y: {
	    get: function get() {
	      return this.bounds.y;
	    },
	    set: function set(v) {
	      this.bounds.y = v;
	    }
	  },
	  width: {
	    get: function get() {
	      return this.bounds.width;
	    },
	    set: function set(v) {
	      this.bounds.width = v;
	    }
	  },
	  height: {
	    get: function get() {
	      return this.bounds.height;
	    },
	    set: function set(v) {
	      this.bounds.height = v;
	    }
	  },
	  left: {
	    get: function get() {
	      return this.bounds.x;
	    },
	    set: function set(v) {
	      this.bounds.left = v;
	    }
	  },
	  top: {
	    get: function get() {
	      return this.bounds.y;
	    },
	    set: function set(v) {
	      this.bounds.top = v;
	    }
	  },
	  right: {
	    get: function get() {
	      return this.bounds.right;
	    },
	    set: function set(v) {
	      this.bounds.right = v;
	    }
	  },
	  bottom: {
	    get: function get() {
	      return this.bounds.bottom;
	    },
	    set: function set(v) {
	      this.bounds.bottom = v;
	    }
	  }
	});

	Selection.create = function (opts) {
	  return new Selection(opts);
	};

	exports.default = Selection;

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _tinytouch = __webpack_require__(10);

	var _tinytouch2 = _interopRequireDefault(_tinytouch);

	var _Listeners = __webpack_require__(1);

	var _Listeners2 = _interopRequireDefault(_Listeners);

	var _Selection = __webpack_require__(6);

	var _Selection2 = _interopRequireDefault(_Selection);

	var _Rectangle = __webpack_require__(2);

	var _Rectangle2 = _interopRequireDefault(_Rectangle);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var SelectionLayer = function () {
	  function SelectionLayer() {
	    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck(this, SelectionLayer);

	    this.selection = _Selection2.default.create(opts);

	    this.parent = opts.parent;
	    this.context = opts.context;
	    this.context.setLineDash = this.context.setLineDash || function () {};
	    this.target = opts.target;

	    var handleOpts = opts.handle || {};
	    handleOpts.length = handleOpts.handleLength || 32;
	    handleOpts.depth = handleOpts.depth || 3;
	    handleOpts.size = handleOpts.size || handleOpts.length * 2;
	    handleOpts.color = handleOpts.color || 'rgba(255, 255, 255, 1.0)';
	    handleOpts.activeColor = handleOpts.activeColor || 'rgba(255, 0, 160, 1.0)';
	    this.handleOpts = handleOpts;

	    this.listeners = _Listeners2.default.create();

	    this.touch = (0, _tinytouch2.default)(this.parent.canvas);

	    this.activeRegion = null;
	    this.downBounds = _Rectangle2.default.create(0, 0, 0, 0);

	    this.touch.on('down', this.onInputDown.bind(this)).on('move', this.onInputMove.bind(this)).on('up', this.onInputUpOrCancel.bind(this)).on('cancel', this.onInputUpOrCancel.bind(this));
	  }

	  _createClass(SelectionLayer, [{
	    key: 'onInputDown',
	    value: function onInputDown(e) {
	      var hitRegion = this.findHitRegion(e);

	      if (hitRegion) {
	        //e.source.preventDefault();
	        this.activeRegion = hitRegion;
	        this.setCursor(hitRegion);
	        this.downBounds.copy(this.selection.bounds);
	        this.listeners.notify('start', this.selection.region);
	      }
	    }
	  }, {
	    key: 'onInputMove',
	    value: function onInputMove(e) {
	      var activeRegion = this.activeRegion;

	      if (!activeRegion) {
	        var hitRegion = this.findHitRegion(e);
	        if (hitRegion) {
	          //e.source.preventDefault();
	          this.setCursor(hitRegion);
	        } else {
	          this.resetCursor();
	        }
	      } else {
	        //e.source.preventDefault();

	        var selection = this.selection;
	        var hasChanged = false;
	        selection.bounds.copy(this.downBounds);

	        if (activeRegion === 'move') {
	          hasChanged = selection.moveBy(e.tx, e.ty);
	          if (hasChanged) {
	            this.listeners.notify('move', this.selection.region);
	          }
	        } else {
	          var dir = activeRegion.substring(0, 2);
	          var dx = dir[1] === 'w' ? -e.tx : e.tx;
	          var dy = dir[0] === 'n' ? -e.ty : e.ty;
	          hasChanged = selection.resizeBy(dx, dy, dir);
	          if (hasChanged) {
	            this.listeners.notify('resize', this.selection.region);
	          }
	        }

	        if (hasChanged) {
	          this.listeners.notify('change', this.selection.region);
	        }
	      }
	    }
	  }, {
	    key: 'onInputUpOrCancel',
	    value: function onInputUpOrCancel(e) {
	      //e.source.preventDefault();
	      if (this.activeRegion) {
	        this.activeRegion = null;
	        this.resetCursor();
	        this.listeners.notify('end', this.selection.region);
	      }
	    }
	  }, {
	    key: 'findHitRegion',
	    value: function findHitRegion(point) {
	      var hitRegion = null;
	      var closest = Number.MAX_VALUE;

	      var d = this.isWithinNorthWestHandle(point);
	      if (d !== false && d < closest) {
	        closest = d;
	        hitRegion = 'nw-resize';
	      }

	      d = this.isWithinNorthEastHandle(point);
	      if (d !== false && d < closest) {
	        closest = d;
	        hitRegion = 'ne-resize';
	      }

	      d = this.isWithinSouthWestHandle(point);
	      if (d !== false && d < closest) {
	        closest = d;
	        hitRegion = 'sw-resize';
	      }

	      d = this.isWithinSouthEastHandle(point);
	      if (d !== false && d < closest) {
	        closest = d;
	        hitRegion = 'se-resize';
	      }

	      if (hitRegion) {
	        return hitRegion;
	      } else if (this.isWithinBounds(point)) {
	        return 'move';
	      } else {
	        return null;
	      }
	    }
	  }, {
	    key: 'on',
	    value: function on(type, fn) {
	      this.listeners.on(type, fn);
	      return this;
	    }
	  }, {
	    key: 'off',
	    value: function off(type, fn) {
	      this.listeners.off(type, fn);
	      return this;
	    }
	  }, {
	    key: 'setCursor',
	    value: function setCursor(type) {
	      if (this.parent.canvas.style.cursor !== type) {
	        this.parent.canvas.style.cursor = type;
	      }
	    }
	  }, {
	    key: 'resetCursor',
	    value: function resetCursor() {
	      this.setCursor('auto');
	    }
	  }, {
	    key: 'isWithinRadius',
	    value: function isWithinRadius(ax, ay, bx, by, r) {
	      var tsq = r * r;
	      var dx = ax - bx;
	      var dy = ay - by;
	      var dsq = dx * dx + dy * dy;
	      return dsq < tsq ? dsq : false;
	    }
	  }, {
	    key: 'isWithinNorthWestHandle',
	    value: function isWithinNorthWestHandle(point) {
	      return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.top, this.getHandleRadius());
	    }
	  }, {
	    key: 'isWithinNorthEastHandle',
	    value: function isWithinNorthEastHandle(point) {
	      return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.top, this.getHandleRadius());
	    }
	  }, {
	    key: 'isWithinSouthWestHandle',
	    value: function isWithinSouthWestHandle(point) {
	      return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.bottom, this.getHandleRadius());
	    }
	  }, {
	    key: 'isWithinSouthEastHandle',
	    value: function isWithinSouthEastHandle(point) {
	      return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.bottom, this.getHandleRadius());
	    }
	  }, {
	    key: 'isWithinBounds',
	    value: function isWithinBounds(point) {
	      return this.selection.isInside(point);
	    }
	  }, {
	    key: 'getHandleRadius',
	    value: function getHandleRadius() {
	      return this.handleOpts.size / 2;
	    }
	  }, {
	    key: 'onImageLoad',
	    value: function onImageLoad() {
	      this.autoSizeRegionAndNotify();
	    }
	  }, {
	    key: 'setAspectRatio',
	    value: function setAspectRatio(aspectRatio) {
	      this.selection.aspectRatio = aspectRatio;
	      this.autoSizeRegionAndNotify();
	    }
	  }, {
	    key: 'autoSizeRegionAndNotify',
	    value: function autoSizeRegionAndNotify() {
	      var hasChanged = this.selection.autoSizeRegion();
	      if (hasChanged) {
	        this.listeners.notify('change', this.selection.region);
	      }
	    }
	  }, {
	    key: 'revalidate',
	    value: function revalidate() {
	      this.selection.updateBoundsFromRegion();
	    }
	  }, {
	    key: 'paint',
	    value: function paint() {
	      this.selection.boundsPx.copy(this.selection.bounds).round();

	      this.paintOutside();
	      this.paintInside();
	    }
	  }, {
	    key: 'paintOutside',
	    value: function paintOutside() {
	      var bounds = this.selection.boundsPx;
	      var g = this.context;
	      var target = this.target;

	      var tl = target.bounds.x;
	      var tt = target.bounds.y;
	      var tw = target.bounds.width;
	      var tr = target.bounds.right;
	      var tb = target.bounds.bottom;

	      var bl = bounds.x;
	      var bt = bounds.y;
	      var bh = bounds.height;
	      var br = bounds.right;
	      var bb = bounds.bottom;

	      g.fillStyle = 'rgba(0, 0, 0, 0.5)';
	      g.fillRect(tl, tt, tw, bt - tt);
	      g.fillRect(tl, bt, bl - tl, bh);
	      g.fillRect(br, bt, tr - br, bh);
	      g.fillRect(tl, bb, tw, tb - bb);
	    }
	  }, {
	    key: 'paintInside',
	    value: function paintInside() {
	      var g = this.context;
	      var bounds = this.selection.boundsPx;
	      var activeRegion = this.activeRegion;
	      var opts = this.handleOpts;

	      var lengthWidth = Math.min(opts.length, bounds.width * 0.5);
	      var lengthHeight = Math.min(opts.length, bounds.height * 0.5);
	      var depth = opts.depth;
	      var color = opts.color;
	      var activeColor = opts.activeColor;
	      var length = 0; // TODO: CHECK

	      // Sides
	      g.fillStyle = 'rgba(255, 255, 255, 0.3)';
	      g.fillRect(bounds.x + length, bounds.y, bounds.width - 2 * length, depth);
	      g.fillRect(bounds.x + length, bounds.bottom - depth, bounds.width - 2 * length, depth);
	      g.fillRect(bounds.x, bounds.y + length, depth, bounds.height - 2 * length);
	      g.fillRect(bounds.right - depth, bounds.y + length, depth, bounds.height - 2 * length);

	      // Handles
	      var isMoveRegion = activeRegion === 'move';

	      g.fillStyle = isMoveRegion || activeRegion === 'nw-resize' ? activeColor : color;
	      g.fillRect(bounds.x, bounds.y, lengthWidth, depth);
	      g.fillRect(bounds.x, bounds.y + depth, depth, lengthHeight - depth);

	      g.fillStyle = isMoveRegion || activeRegion === 'ne-resize' ? activeColor : color;
	      g.fillRect(bounds.right - lengthWidth, bounds.y, lengthWidth, depth);
	      g.fillRect(bounds.right - depth, bounds.y + depth, depth, lengthHeight - depth);

	      g.fillStyle = isMoveRegion || activeRegion === 'sw-resize' ? activeColor : color;
	      g.fillRect(bounds.x, bounds.bottom - depth, lengthWidth, depth);
	      g.fillRect(bounds.x, bounds.bottom - lengthHeight, depth, lengthHeight - depth);

	      g.fillStyle = isMoveRegion || activeRegion === 'se-resize' ? activeColor : color;
	      g.fillRect(bounds.right - lengthWidth, bounds.bottom - depth, lengthWidth, depth);
	      g.fillRect(bounds.right - depth, bounds.bottom - lengthHeight, depth, lengthHeight - depth);

	      // Guides
	      g.strokeStyle = 'rgba(255, 255, 255, 0.6)';
	      g.setLineDash([2, 3]);
	      g.lineWidth = 1;
	      g.beginPath();
	      var bw3 = bounds.width / 3;
	      var bh3 = bounds.height / 3;
	      g.moveTo(bounds.x + bw3, bounds.y);
	      g.lineTo(bounds.x + bw3, bounds.y + bounds.height);
	      g.moveTo(bounds.x + 2 * bw3, bounds.y);
	      g.lineTo(bounds.x + 2 * bw3, bounds.y + bounds.height);
	      g.moveTo(bounds.x, bounds.y + bh3);
	      g.lineTo(bounds.x + bounds.width, bounds.y + bh3);
	      g.moveTo(bounds.x, bounds.y + 2 * bh3);
	      g.lineTo(bounds.x + bounds.width, bounds.y + 2 * bh3);
	      g.stroke();
	      g.closePath();
	    }
	  }]);

	  return SelectionLayer;
	}();

	SelectionLayer.create = function (opts) {
	  return new SelectionLayer(opts);
	};

	exports.default = SelectionLayer;

/***/ },
/* 8 */
/***/ function(module, exports) {

	"use strict";

	exports.__esModule = true;
	// http://snippetrepo.com/snippets/basic-vanilla-javascript-throttlingdebounce
	function debounce(fn, wait, immediate) {
	  var timeout = void 0;
	  return function () {
	    var context = this;
	    var args = arguments;
	    clearTimeout(timeout);
	    timeout = setTimeout(function () {
	      timeout = null;
	      if (!immediate) fn.apply(context, args);
	    }, wait);
	    if (immediate && !timeout) fn.apply(context, args);
	  };
	}
	exports.default = debounce;

/***/ },
/* 9 */
/***/ function(module, exports) {

	'use strict';

	exports.__esModule = true;
	/*
	 * Modified version of http://github.com/desandro/imagesloaded v2.1.1
	 * MIT License.
	 */

	var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

	function loadImage(image, callback) {
	  if (!image.nodeName || image.nodeName.toLowerCase() !== 'img') {
	    return callback(new Error('First argument must an image element'));
	  }

	  if (image.src && image.complete && image.naturalWidth !== undefined) {
	    return callback(null, true);
	  }

	  image.addEventListener('load', function () {
	    callback(null, false);
	  });

	  image.addEventListener('error', function (e) {
	    callback(new Error('Failed to load image \'' + (image.src || '') + '\''));
	  });

	  if (image.complete) {
	    var src = image.src;
	    image.src = BLANK;
	    image.src = src;
	  }
	}

	exports.default = loadImage;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.CANCEL = exports.UP = exports.DRAG = exports.MOVE = exports.DOWN = undefined;

	var _tinyEmitter = __webpack_require__(11);

	var _tinyEmitter2 = _interopRequireDefault(_tinyEmitter);

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { default: obj };
	}

	var createListen = function createListen(element) {
	  return function (name, cb) {
	    element.addEventListener(name, cb);
	  };
	};

	var create = function create() {
	  var domElement = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window;

	  var emitter = new _tinyEmitter2.default();
	  var instance = {};
	  var listen = createListen(domElement);
	  var downEvent = null;
	  var moveEvent = null;

	  var on = function on(name, fn) {
	    emitter.on(name, fn);
	    return instance;
	  };

	  var once = function once(name, fn) {
	    emitter.once(name, fn);
	    return instance;
	  };

	  var off = function off(name, fn) {
	    emitter.off(name, fn);
	    return instance;
	  };

	  var isDown = function isDown() {
	    return !!downEvent;
	  };

	  var createEvent = function createEvent(source, x, y, type) {
	    var prevEvent = moveEvent || downEvent;
	    return {
	      source: source,
	      x: x,
	      y: y,
	      dx: prevEvent ? x - prevEvent.x : 0,
	      dy: prevEvent ? y - prevEvent.y : 0,
	      tx: downEvent ? x - downEvent.x : 0,
	      ty: downEvent ? y - downEvent.y : 0,
	      type: type
	    };
	  };

	  var createEventForMouse = function createEventForMouse(source) {
	    var target = source.target || source.srcElement;
	    var bounds = target.getBoundingClientRect();
	    var x = source.clientX - bounds.left;
	    var y = source.clientY - bounds.top;
	    return createEvent(source, x, y, 'Mouse');
	  };

	  var createEventForTouch = function createEventForTouch(source) {
	    var bounds = source.target.getBoundingClientRect();
	    var touch = source.touches.length > 0 ? source.touches[0] : source.changedTouches[0];
	    var x = touch.clientX - bounds.left;
	    var y = touch.clientY - bounds.top;
	    return createEvent(source, x, y, 'Touch');
	  };

	  var handleDown = function handleDown(event) {
	    downEvent = event;
	    emitter.emit(DOWN, event);
	  };

	  var handleMove = function handleMove(event) {
	    moveEvent = event;
	    emitter.emit(MOVE, event);
	    if (isDown()) {
	      emitter.emit(DRAG, event);
	    }
	  };

	  var handleUp = function handleUp(event) {
	    emitter.emit(UP, event);
	    downEvent = null;
	    moveEvent = null;
	  };

	  var handleCancel = function handleCancel(event) {
	    emitter.emit(CANCEL, event);
	    downEvent = null;
	    moveEvent = null;
	  };

	  listen('mousedown', function (source) {
	    return handleDown(createEventForMouse(source));
	  });
	  listen('touchstart', function (source) {
	    return handleDown(createEventForTouch(source));
	  });

	  listen('mousemove', function (source) {
	    return handleMove(createEventForMouse(source));
	  });
	  listen('touchmove', function (source) {
	    return handleMove(createEventForTouch(source));
	  });

	  listen('mouseup', function (source) {
	    return handleUp(createEventForMouse(source));
	  });
	  listen('touchend', function (source) {
	    return handleUp(createEventForTouch(source));
	  });

	  listen('mouseout', function (source) {
	    return handleCancel(createEventForMouse(source));
	  });
	  listen('touchcancel', function (source) {
	    return handleCancel(createEventForTouch(source));
	  });

	  instance.on = on;
	  instance.once = once;
	  instance.off = off;

	  return instance;
	};

	exports.default = create;
	var DOWN = exports.DOWN = 'down';
	var MOVE = exports.MOVE = 'move';
	var DRAG = exports.DRAG = 'drag';
	var UP = exports.UP = 'up';
	var CANCEL = exports.CANCEL = 'cancel';

/***/ },
/* 11 */
/***/ function(module, exports) {

	function E () {
	  // Keep this empty so it's easier to inherit from
	  // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
	}

	E.prototype = {
	  on: function (name, callback, ctx) {
	    var e = this.e || (this.e = {});

	    (e[name] || (e[name] = [])).push({
	      fn: callback,
	      ctx: ctx
	    });

	    return this;
	  },

	  once: function (name, callback, ctx) {
	    var self = this;
	    function listener () {
	      self.off(name, listener);
	      callback.apply(ctx, arguments);
	    };

	    listener._ = callback
	    return this.on(name, listener, ctx);
	  },

	  emit: function (name) {
	    var data = [].slice.call(arguments, 1);
	    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
	    var i = 0;
	    var len = evtArr.length;

	    for (i; i < len; i++) {
	      evtArr[i].fn.apply(evtArr[i].ctx, data);
	    }

	    return this;
	  },

	  off: function (name, callback) {
	    var e = this.e || (this.e = {});
	    var evts = e[name];
	    var liveEvents = [];

	    if (evts && callback) {
	      for (var i = 0, len = evts.length; i < len; i++) {
	        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
	          liveEvents.push(evts[i]);
	      }
	    }

	    // Remove event from queue to prevent memory leak
	    // Suggested by https://github.com/lazd
	    // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

	    (liveEvents.length)
	      ? e[name] = liveEvents
	      : delete e[name];

	    return this;
	  }
	};

	module.exports = E;


/***/ }
/******/ ])
});
;
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.autocomplete = factory());
}(this, (function () { 'use strict';

    /**
     * Copyright (c) 2016 Denys Krasnoshchok
     *
     * Homepage: https://smartscheduling.com/en/documentation/autocomplete
     * Source: https://github.com/kraaden/autocomplete
     *
     * MIT License
     */
    function autocomplete(settings) {

        // just an alias to minimize JS file size
        var doc = document;
        var container = settings.container || doc.createElement('div');
        container.id = container.id || 'autocomplete-' + uid();
        var containerStyle = container.style;
        var debounceWaitMs = settings.debounceWaitMs || 0;
        var preventSubmit = settings.preventSubmit || false;
        var disableAutoSelect = settings.disableAutoSelect || false;
        var customContainerParent = container.parentElement;
        var items = [];
        var inputValue = '';
        var minLen = 2;
        var showOnFocus = settings.showOnFocus;
        var selected;
        var fetchCounter = 0;
        var debounceTimer;
        var destroyed = false;
        if (settings.minLength !== undefined) {
            minLen = settings.minLength;
        }
        if (!settings.input) {
            throw new Error('input undefined');
        }
        var input = settings.input;
        container.className = 'autocomplete ' + (settings.className || '');
        container.setAttribute('role', 'listbox');
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-controls', container.id);
        input.setAttribute('aria-owns', container.id);
        input.setAttribute('aria-activedescendant', '');
        input.setAttribute('aria-haspopup', 'listbox');
        // IOS implementation for fixed positioning has many bugs, so we will use absolute positioning
        containerStyle.position = 'absolute';
        /**
         * Generate a very complex textual ID that greatly reduces the chance of a collision with another ID or text.
         */
        function uid() {
            return Date.now().toString(36) + Math.random().toString(36).substring(2);
        }
        /**
         * Detach the container from DOM
         */
        function detach() {
            var parent = container.parentNode;
            if (parent) {
                parent.removeChild(container);
            }
        }
        /**
         * Clear debouncing timer if assigned
         */
        function clearDebounceTimer() {
            if (debounceTimer) {
                window.clearTimeout(debounceTimer);
            }
        }
        /**
         * Attach the container to DOM
         */
        function attach() {
            if (!container.parentNode) {
                (customContainerParent || doc.body).appendChild(container);
            }
        }
        /**
         * Check if container for autocomplete is displayed
         */
        function containerDisplayed() {
            return !!container.parentNode;
        }
        /**
         * Clear autocomplete state and hide container
         */
        function clear() {
            // prevent the update call if there are pending AJAX requests
            fetchCounter++;
            items = [];
            inputValue = '';
            selected = undefined;
            input.setAttribute('aria-activedescendant', '');
            input.setAttribute('aria-expanded', 'false');
            detach();
        }
        /**
         * Update autocomplete position
         */
        function updatePosition() {
            if (!containerDisplayed()) {
                return;
            }
            input.setAttribute('aria-expanded', 'true');
            containerStyle.height = 'auto';
            containerStyle.width = input.offsetWidth + 'px';
            var maxHeight = 0;
            var inputRect;
            function calc() {
                var docEl = doc.documentElement;
                var clientTop = docEl.clientTop || doc.body.clientTop || 0;
                var clientLeft = docEl.clientLeft || doc.body.clientLeft || 0;
                var scrollTop = window.pageYOffset || docEl.scrollTop;
                var scrollLeft = window.pageXOffset || docEl.scrollLeft;
                inputRect = input.getBoundingClientRect();
                var top = inputRect.top + input.offsetHeight + scrollTop - clientTop;
                var left = inputRect.left + scrollLeft - clientLeft;
                containerStyle.top = top + 'px';
                containerStyle.left = left + 'px';
                maxHeight = window.innerHeight - (inputRect.top + input.offsetHeight);
                if (maxHeight < 0) {
                    maxHeight = 0;
                }
                containerStyle.top = top + 'px';
                containerStyle.bottom = '';
                containerStyle.left = left + 'px';
                containerStyle.maxHeight = maxHeight + 'px';
            }
            // the calc method must be called twice, otherwise the calculation may be wrong on resize event (chrome browser)
            calc();
            calc();
            if (settings.customize && inputRect) {
                settings.customize(input, inputRect, container, maxHeight);
            }
        }
        /**
         * Redraw the autocomplete div element with suggestions
         */
        function update() {
            container.innerHTML = '';
            input.setAttribute('aria-activedescendant', '');
            // function for rendering autocomplete suggestions
            var render = function (item, _, __) {
                var itemElement = doc.createElement('div');
                itemElement.textContent = item.label || '';
                return itemElement;
            };
            if (settings.render) {
                render = settings.render;
            }
            // function to render autocomplete groups
            var renderGroup = function (groupName, _) {
                var groupDiv = doc.createElement('div');
                groupDiv.textContent = groupName;
                return groupDiv;
            };
            if (settings.renderGroup) {
                renderGroup = settings.renderGroup;
            }
            var fragment = doc.createDocumentFragment();
            var prevGroup = uid();
            items.forEach(function (item, index) {
                if (item.group && item.group !== prevGroup) {
                    prevGroup = item.group;
                    var groupDiv = renderGroup(item.group, inputValue);
                    if (groupDiv) {
                        groupDiv.className += ' group';
                        fragment.appendChild(groupDiv);
                    }
                }
                var div = render(item, inputValue, index);
                if (div) {
                    div.id = container.id + "_" + index;
                    div.setAttribute('role', 'option');
                    div.addEventListener('click', function (ev) {
                        settings.onSelect(item, input);
                        clear();
                        ev.preventDefault();
                        ev.stopPropagation();
                    });
                    if (item === selected) {
                        div.className += ' selected';
                        div.setAttribute('aria-selected', 'true');
                        input.setAttribute('aria-activedescendant', div.id);
                    }
                    fragment.appendChild(div);
                }
            });
            container.appendChild(fragment);
            if (items.length < 1) {
                if (settings.emptyMsg) {
                    var empty = doc.createElement('div');
                    empty.id = container.id + "_" + uid();
                    empty.className = 'empty';
                    empty.textContent = settings.emptyMsg;
                    container.appendChild(empty);
                    input.setAttribute('aria-activedescendant', empty.id);
                }
                else {
                    clear();
                    return;
                }
            }
            attach();
            updatePosition();
            updateScroll();
        }
        function updateIfDisplayed() {
            if (containerDisplayed()) {
                update();
            }
        }
        function resizeEventHandler() {
            updateIfDisplayed();
        }
        function scrollEventHandler(e) {
            if (e.target !== container) {
                updateIfDisplayed();
            }
            else {
                e.preventDefault();
            }
        }
        function inputEventHandler() {
            fetch(0 /* Keyboard */);
            tools.autocompleteClear(input);/*Yakubets*/
        }
        /**
         * Automatically move scroll bar if selected item is not visible
         */
        function updateScroll() {
            var elements = container.getElementsByClassName('selected');
            if (elements.length > 0) {
                var element = elements[0];
                // make group visible
                var previous = element.previousElementSibling;
                if (previous && previous.className.indexOf('group') !== -1 && !previous.previousElementSibling) {
                    element = previous;
                }
                if (element.offsetTop < container.scrollTop) {
                    container.scrollTop = element.offsetTop;
                }
                else {
                    var selectBottom = element.offsetTop + element.offsetHeight;
                    var containerBottom = container.scrollTop + container.offsetHeight;
                    if (selectBottom > containerBottom) {
                        container.scrollTop += selectBottom - containerBottom;
                    }
                }
            }
        }
        function selectPreviousSuggestion() {
            var index = items.indexOf(selected);
            selected = index === -1
                ? undefined
                : items[(index + items.length - 1) % items.length];
        }
        function selectNextSuggestion() {
            var index = items.indexOf(selected);
            selected = items.length < 1
                ? undefined
                : index === -1
                    ? items[0]
                    : items[(index + 1) % items.length];
        }
        function handleArrowAndEscapeKeys(ev, key) {
            var containerIsDisplayed = containerDisplayed();
            if (key === 'Escape') {
                clear();
            }
            else {
                if (!containerIsDisplayed || items.length < 1) {
                    return;
                }
                key === 'ArrowUp'
                    ? selectPreviousSuggestion()
                    : selectNextSuggestion();
                update();
            }
            ev.preventDefault();
            if (containerIsDisplayed) {
                ev.stopPropagation();
            }
        }
        function handleEnterKey(ev) {
            if (selected) {
                settings.onSelect(selected, input);
                clear();
            }
            if (preventSubmit) {
                ev.preventDefault();
            }
        }
        function keydownEventHandler(ev) {
            var key = ev.key;
            switch (key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'Escape':
                    handleArrowAndEscapeKeys(ev, key);
                    break;
                case 'Enter':
                    handleEnterKey(ev);
                    break;
            }
        }
        function focusEventHandler() {
            if (showOnFocus) {
                fetch(1 /* Focus */);
            }
        }
        function fetch(trigger) {
            if (input.value.length >= minLen || trigger === 1 /* Focus */) {
                clearDebounceTimer();
                debounceTimer = window.setTimeout(function () { return startFetch(input.value, trigger, input.selectionStart || 0); }, trigger === 0 /* Keyboard */ || trigger === 2 /* Mouse */ ? debounceWaitMs : 0);
            }
            else {
                clear();
            }
        }
        function startFetch(inputText, trigger, cursorPos) {
            if (destroyed)
                return;
            var savedFetchCounter = ++fetchCounter;
            settings.fetch(inputText, function (elements) {
                if (fetchCounter === savedFetchCounter && elements) {
                    items = elements;
                    inputValue = inputText;
                    selected = (items.length < 1 || disableAutoSelect) ? undefined : items[0];
                    update();
                }
            }, trigger, cursorPos);
        }
        function keyupEventHandler(e) {
            if (settings.keyup) {
                settings.keyup({
                    event: e,
                    fetch: function () { return fetch(0 /* Keyboard */); }
                });
                return;
            }
            if (!containerDisplayed() && e.key === 'ArrowDown') {
                fetch(0 /* Keyboard */);
            }
        }
        function clickEventHandler(e) {
            settings.click && settings.click({
                event: e,
                fetch: function () { return fetch(2 /* Mouse */); }
            });
        }
        function blurEventHandler() {
            // when an item is selected by mouse click, the blur event will be initiated before the click event and remove DOM elements,
            // so that the click event will never be triggered. In order to avoid this issue, DOM removal should be delayed.
            setTimeout(function () {
                if (doc.activeElement !== input) {
                    clear();
                }
            }, 200);
        }
        function manualFetch() {
            startFetch(input.value, 3 /* Manual */, input.selectionStart || 0);
        }
        /**
         * Fixes #26: on long clicks focus will be lost and onSelect method will not be called
         */
        container.addEventListener('mousedown', function () {
            event.stopPropagation();
            event.preventDefault();
        }, { passive: false });
        /**
         * Fixes #30: autocomplete closes when scrollbar is clicked in IE
         * See: https://stackoverflow.com/a/9210267/13172349
         */
        container.addEventListener('focus', function () { return input.focus(); });
        /**
         * This function will remove DOM elements and clear event handlers
         */
        function destroy() {
            input.removeEventListener('focus', focusEventHandler);
            input.removeEventListener('keyup', keyupEventHandler);
            input.removeEventListener('click', clickEventHandler);
            input.removeEventListener('keydown', keydownEventHandler);
            input.removeEventListener('input', inputEventHandler);
            input.removeEventListener('blur', blurEventHandler);
            window.removeEventListener('resize', resizeEventHandler);
            doc.removeEventListener('scroll', scrollEventHandler, true);
            input.removeAttribute('role');
            input.removeAttribute('aria-expanded');
            input.removeAttribute('aria-autocomplete');
            input.removeAttribute('aria-controls');
            input.removeAttribute('aria-activedescendant');
            input.removeAttribute('aria-owns');
            input.removeAttribute('aria-haspopup');
            clearDebounceTimer();
            clear();
            destroyed = true;
        }
        // setup event handlers
        input.addEventListener('keyup', keyupEventHandler);
        input.addEventListener('click', clickEventHandler);
        input.addEventListener('keydown', keydownEventHandler);
        input.addEventListener('input', inputEventHandler);
        input.addEventListener('blur', blurEventHandler);
        input.addEventListener('focus', focusEventHandler);
        window.addEventListener('resize', resizeEventHandler);
        doc.addEventListener('scroll', scrollEventHandler, true);
        return {
            destroy: destroy,
            fetch: manualFetch
        };
    }

    return autocomplete;

})));

/*
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.pell = {})));
}(this, (function (exports) { 'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var defaultParagraphSeparatorString = 'defaultParagraphSeparator';
var formatBlock = 'formatBlock';
var addEventListener = function addEventListener(parent, type, listener) {
  return parent.addEventListener(type, listener);
};
var appendChild = function appendChild(parent, child) {
  return parent.appendChild(child);
};
var createElement = function createElement(tag) {
  return document.createElement(tag);
};
var queryCommandState = function queryCommandState(command) {
  return document.queryCommandState(command);
};
var queryCommandValue = function queryCommandValue(command) {
  return document.queryCommandValue(command);
};

var exec = function exec(command) {
  var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  return document.execCommand(command, false, value);
};

var defaultActions = {
  bold: {
    icon: '<b>B</b>',
    title: 'Bold',
    state: function state() {
      return queryCommandState('bold');
    },
    result: function result() {
      return exec('bold');
    }
  },
  italic: {
    icon: '<i>I</i>',
    title: 'Italic',
    state: function state() {
      return queryCommandState('italic');
    },
    result: function result() {
      return exec('italic');
    }
  },
  underline: {
    icon: '<u>U</u>',
    title: 'Underline',
    state: function state() {
      return queryCommandState('underline');
    },
    result: function result() {
      return exec('underline');
    }
  },
  strikethrough: {
    icon: '<strike>S</strike>',
    title: 'Strike-through',
    state: function state() {
      return queryCommandState('strikeThrough');
    },
    result: function result() {
      return exec('strikeThrough');
    }
  },
  heading1: {
    icon: '<b>H<sub>1</sub></b>',
    title: 'Heading 1',
    result: function result() {
      return exec(formatBlock, '<h1>');
    }
  },
  heading2: {
    icon: '<b>H<sub>2</sub></b>',
    title: 'Heading 2',
    result: function result() {
      return exec(formatBlock, '<h2>');
    }
  },
  paragraph: {
    icon: '&#182;',
    title: 'Paragraph',
    result: function result() {
      return exec(formatBlock, '<p>');
    }
  },
  quote: {
    icon: '&#8220; &#8221;',
    title: 'Quote',
    result: function result() {
      return exec(formatBlock, '<blockquote>');
    }
  },
  olist: {
    icon: '&#35;',
    title: 'Ordered List',
    result: function result() {
      return exec('insertOrderedList');
    }
  },
  ulist: {
    icon: '&#8226;',
    title: 'Unordered List',
    result: function result() {
      return exec('insertUnorderedList');
    }
  },
  code: {
    icon: '&lt;/&gt;',
    title: 'Code',
    result: function result() {
      return exec(formatBlock, '<pre>');
    }
  },
  line: {
    icon: '&#8213;',
    title: 'Horizontal Line',
    result: function result() {
      return exec('insertHorizontalRule');
    }
  },
  link: {
    icon: '&#128279;',
    title: 'Link',
    result: function result() {
      var url = window.prompt('Enter the link URL');
      if (url) exec('createLink', url);
    }
  },
  image: {
    icon: '&#128247;',
    title: 'Image',
    result: function result() {
      var url = window.prompt('Enter the image URL');
      if (url) exec('insertImage', url);
    }
  }
};

var defaultClasses = {
  actionbar: 'pell-actionbar',
  button: 'pell-button',
  content: 'pell-content',
  selected: 'pell-button-selected'
};

var init = function init(settings) {
  var actions = settings.actions ? settings.actions.map(function (action) {
    if (typeof action === 'string') return defaultActions[action];else if (defaultActions[action.name]) return _extends({}, defaultActions[action.name], action);
    return action;
  }) : Object.keys(defaultActions).map(function (action) {
    return defaultActions[action];
  });

  var classes = _extends({}, defaultClasses, settings.classes);

  var defaultParagraphSeparator = settings[defaultParagraphSeparatorString] || 'div';

  var actionbar = createElement('div');
  actionbar.className = classes.actionbar;
  appendChild(settings.element, actionbar);

  var content = settings.element.content = createElement('div');


	if (settings["onInitContent"]) {
		
		content.innerHTML = settings["onInitContent"];
		
	}

  content.contentEditable = true;
  content.className = classes.content;
  
  content.oninput = function (_ref) {

    var firstChild = _ref.target.firstChild;


    if (firstChild && firstChild.nodeType === 3) {
		
		exec(formatBlock, '<' + defaultParagraphSeparator + '>');
		
	} else {
		
		if (content.innerHTML === '<br>') {
			
			content.innerHTML = '';
		}
	}
    settings.onChange(content.innerHTML);
  };
  
  content.onkeydown = function (event) {
    if (event.key === 'Enter' && queryCommandValue(formatBlock) === 'blockquote') {
      setTimeout(function () {
        return exec(formatBlock, '<' + defaultParagraphSeparator + '>');
      }, 0);
    }
  };
  appendChild(settings.element, content);

  actions.forEach(function (action) {
    var button = createElement('button');
    button.className = classes.button;
    button.innerHTML = action.icon;
    button.title = action.title;
    button.setAttribute('type', 'button');
    button.onclick = function () {
      return action.result() && content.focus();
    };

    if (action.state) {
      var handler = function handler() {
        return button.classList[action.state() ? 'add' : 'remove'](classes.selected);
      };
      addEventListener(content, 'keyup', handler);
      addEventListener(content, 'mouseup', handler);
      addEventListener(button, 'click', handler);
    }

    appendChild(actionbar, button);
  });

  if (settings.styleWithCSS) exec('styleWithCSS');
  exec(defaultParagraphSeparatorString, defaultParagraphSeparator);

  return settings.element;
};

var pell = { exec: exec, init: init };

exports.exec = exec;
exports.init = init;
exports['default'] = pell;

Object.defineProperty(exports, '__esModule', { value: true });

})));
*/

class Pell {
	
	init(settings) {

		var formatBlock = "formatBlock";
		
		var defaultParagraphSeparatorString = "defaultParagraphSeparator";
		
		var queryCommandState = function queryCommandState(command) {
			
			return document.queryCommandState(command);
		
		};
		
		var queryCommandValue = function queryCommandValue(command) {
			
			return document.queryCommandValue(command);
		
		};

		var exec = function exec(command) {
			
			var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
			//console.log(command,  value);
			return document.execCommand(command, false, value);
			
		};

		var defaultParagraphSeparator = settings?.["defaultParagraphSeparatorString"] || "p";
		
		var defaultClasses = {
			
			actionbar: "pell-actionbar",
			button: "pell-button",
			content: "pell-content",
			selected: "pell-button-selected",
			
		};
		
		var defaultActions = {
			
			bold: {
				icon: "<strong>B</strong>",
				title: "Bold",
				state: function state() {
					return queryCommandState("bold");
				},
				result: function result() {
					
					return exec("bold");
					
				}
			},
			italic: {
				icon: "<em>I</em>",
				title: "Italic",
				state: function state() {
					return queryCommandState("italic");
				},
				result: function result() {
					return exec("italic");
				}
			},
			underline: {
				icon: "<u>U</u>",
				title: "Underline",
				state: function state() {
					return queryCommandState("underline");
				},
				result: function result() {
					return exec("underline");
				}
			},
			strikethrough: {
				icon: "<strike>S</strike>",
				title: "Strike-through",
				state: function state() {
					return queryCommandState("strikeThrough");
				},
				result: function result() {
					return exec("strikeThrough");
				}
			},
			h2: {
				icon: "<b>H<sub>2</sub></b>",
				title: "Heading 2",
				result: function result() {
					return exec(formatBlock, "<h2>");
				}
			},
			h3: {
				icon: "<b>H<sub>3</sub></b>",
				title: "Heading 3",
				result: function result() {
					return exec(formatBlock, "<h3>");
				}
			},
			paragraph: {
				icon: "&#182;",
				title: "Paragraph",
				result: function result() {
					return exec(formatBlock, "<p>");
				}
			},
			quote: {
				icon: "&#8220; &#8221;",
				title: "Quote",
				result: function result() {
					return exec(formatBlock, "<blockquote>");
				}
			},
			olist: {
				icon: "&#35;",
				title: "Ordered List",
				result: function result() {
					return exec("insertOrderedList");
				}
			},
			ulist: {
				icon: "&#8226;",
				title: "Unordered List",
				result: function result() {
					return exec("insertUnorderedList");
				}
			},
			code: {
				icon: "&lt;/&gt;",
				title: "Code",
				result: function result() {
					return exec(formatBlock, "<pre>");
				}
			},
			line: {
				icon: "&#8213;",
				title: "Horizontal Line",
				result: function result() {
					return exec("insertHorizontalRule");
				}
			},
			link: {
				icon: "L"/*"&#128279;"*/,
				title: "Link",
				result: function result() {
					var url = window.prompt("Enter the link URL");
					if (url) {
						exec("createLink", url);
					}
				}
			},
			image: {
				icon: "&#128247;",
				title: "Image",
				result: function result() {
					var url = window.prompt("Enter the image URL");
					if (url) {
						exec("insertImage", url);
					}
				}
			}
		};

		var classes = Object.assign({}, defaultClasses, settings.classes);
		
		
		var actionbar = element.create("div",{"class": classes.actionbar});
		settings.element.appendChild(actionbar);
		
		var content = element.create("div", {"class":classes.content});
		content.contentEditable = true;
		
		content.innerHTML = settings.contentHTML;
		
		if (settings.contentStyle) {
			
			content.setAttribute("style", settings.contentStyle);
			
		}
		
		content.oninput = function (_ref) {

			var firstChild = _ref.target.firstChild;


			if (firstChild && firstChild.nodeType === 3) {

				exec(formatBlock, "<" + defaultParagraphSeparator + ">");

			} else {

				if (content.innerHTML === "<br>") {

					content.innerHTML = "";
					
				}
			}
			
			var $c = content.innerHTML;

			$c = $c.replace(/<i>/gi, "<em>");
			$c = $c.replace(/<\/i>/gi, "</em>");

			$c = $c.replace(/<b>/gi, "<strong>");
			$c = $c.replace(/<\/b>/gi, "</strong>");
			
			//content.innerHTML = $c;
			settings.onChange($c);
		};

		content.onkeydown = function (event) {
			
			if (event.key === "Enter" && queryCommandValue(formatBlock) === "blockquote") {
				
				setTimeout(function () {
					
					return exec(formatBlock, "<" + defaultParagraphSeparator + ">");
					
				}, 0);
				
			}
		};
		
		settings.element.appendChild(content);

		var actions = settings.actions ? settings.actions.map(function (action) {

			if (typeof action === "string") {
				
				return defaultActions[action];
				
			} else {
			
				return action;
			
			}
		}) : Object.keys(defaultActions).map(function (action) {

			return defaultActions[action];

		});

		var addEventListener = function addEventListener(parent, type, listener) {
			
			return parent.addEventListener(type, listener);
		
		};

		actions.forEach(function (action) {
			
			var button = element.create("button", {
				"class"	:	classes.button,
				"html"	:	action.icon,
				"attr"	:	{
					"title"	:	action.title,
					"type"	:	"button",
				},
			
			});

			button.onclick = function () {
				
				return action.result() && content.focus();
				
			};

			if (action.state) {
				
				var handler = function handler() {
					
					return button.classList[action.state() ? "add" : "remove"](classes.selected);
					
				};
				
				addEventListener(content, "keyup", handler);
				addEventListener(content, "mouseup", handler);
				addEventListener(button, "click", handler);

				/*content.addEventListener("keyup", handler);
				content.addEventListener("mouseup", handler);
				button.addEventListener("click", handler);*/

			}

			actionbar.appendChild(button);
		
		});
		
		if (settings.styleWithCSS) exec("styleWithCSS");
		
		exec(defaultParagraphSeparatorString, defaultParagraphSeparator);
		
		return settings.element;

	}

}

Factory.register("Pell", Pell);pell = Factory.create("Pell");
class ShopTools {
	
	itemToolbarSet(config, block) {
	
		while (block.firstChild) {//видаляємо всі дочірні елементи
			
			block.removeChild(block.firstChild);
			
		}

		if (!isNaN(parseInt(config.itemID))) {//при редагуванні товару
			
			var args = {
				
				h	:	"exec",
				a	:	{
					"name"		:	"itemToolbarDataGet",//method
					"work"		:	1
				},
				p	:	config,
			};
			
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);

					if (d["info"]["success"]) {

						/*вже є, як мінімум, права на перегляд*/
						var groupsForm = element.create("div", {
							"class"	:	"groups",
							"attr"	:	{
								"data-type"	:	"form"
							}
						});
						block.append(groupsForm);
						
						var line = element.create("div", {
							"class"	:	"line"
						});
						groupsForm.append(line);
						
						var $itemList = element.create("div", {
							"class"	:	"itemList"
						});
						
						groupsForm.append(element.create("input", {
							"attr"	:	{
								"type"	:	"hidden",
								"data-name":"parent"
							},
							"value"		:	parseInt(config["itemID"]),
							"readonly"	:	true,
						}));
						
						groupsForm.append(element.create("input", {
							"attr"	:	{
								"type"	:	"hidden",
								"data-name":"table"
							},
							"value"		:	config["table"],
						}));

						var toolbarLeft = element.create("div", {
							"class"	:	"toolbar"
						});
						
						var reloadButton = element.create("button", {
							
							"class"	:	["la", "la-24", "la-refresh", "h-40"],
							"attr"	:	{
								"type":			"button",
								"title":		library.get("Reload"),
								"data-action":	"item-toolbar-reload",
							}
							
						});
						
						var callbackF = function(p1, p2) {
							
							return function() {
								
								shopTools.itemToolbarSet(p1, p2);
								
							};
							
						};
						
						reloadButton.addEventListener("click", callbackF(config, block));
						
						toolbarLeft.append(reloadButton);

						var $deleteBtn = null;
						var $addButton = null;
						var $addInput = null;

						if (d?.["permission"] && d["permission"] == "1111") {//повинні бути права на все
							
							$addButton = element.create("button", {
								
								"class"	:	["la", "la-24", "la-plus", "h-40"],
								"attr"	:	{
									"type":			"button",
									"title":		library.get("Add"),
									"onclick"	:	"shopTools.itemToolbarAdd(this)"
								}
								
							});
							
							$addInput = element.create("input", {
								"attr"	:	{
									"onfocus"		:	"shopTools.itemToolbarSearchByID(this, '"+config["table"]+"')",
									"type"			:	"hidden",
									"data-action"	:	"item-toolbar-search",
									"placeholder"	:	library.get("Start Writing")+", ID",
								}
							});
							
							$addInput.addEventListener("keypress", function() {
								
								if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
									event.preventDefault();
								}
								
							});
							
							var saveButton = element.create("button", {
								
								"class"	:	["la", "la-24", "la-save", "h-40"],
								"attr"	:	{
									"type":			"button",
									"title":		library.get("Save"),
									"data-action":	"item-toolbar-save",
									"onclick"	:	"shopTools.itemToolbarSaveBtn(this)"
								}
								
							});
							
							toolbarLeft.append(saveButton);
							
							/*сортування*/

							var toolbarRight = element.create("div", {"class":"toolbar"});
							line.append(toolbarRight);
							
							var sortableButton = element.create("button", {
								"class"	:	["la", "la-24", "la-sort", "h-40"],
								"attr"	:	{
									"type"			:	"button",
									"title"			:	library.get("Sorted"),
									"data-state"	:	0,
								}
							});
							
							var callbackF = function(p1, p2) {
								return function() {
									sortable.make(p1, p2);
								};
							};
							sortableButton.addEventListener("click", callbackF($itemList, sortableButton));

							var serializeButton = element.create("button", {
								"class"	:	["las", "la-24", "la-save", "h-40", "primary", "displayNone"],
								"attr"	:	{
									"type"		:	"button",
									"title"		:	library.get("Organize  Sorted"),
									"onclick"	:	"shopTools.itemToolbarSerialize(this)"
								}
							});
							
							toolbarRight.prepend(serializeButton);
							toolbarRight.prepend(sortableButton);

							/*\сортування*/

						}
						
						toolbarLeft.append(element.create("div", {
							"class"	:	["bg-olive", "disabled", "h-40"], 
							"html"	:	library.get(config["table"]),
							"attr"	:	{
								"data-action"	:	"info",
							}
						}));
						
						var count = d["data"]["count"];
						
						toolbarLeft.append(element.create("div",{
							"class"	:	"count",
							"html"	:	count
						}));
						
						var input = element.create("input", {
							"attr"	:	{
								"type"			:	"text",
								"data-name"		:	"items",
								"ondblclick"	:	"runTools.setInputNotReadonly(this)"
							},
							"readonly"	:	true,
						});
						
						input.addEventListener("keypress", function() {
							
							if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
								event.preventDefault();
								var formO = event.target.closest("[data-type='form']");
								shopTools.itemToolbarDataSave(form.returnData(formO), formO);
							}
							
						});
						
						toolbarLeft.append(input);
						
						if ($addButton) {
							
							toolbarLeft.append($addButton);
							
						}
						
						if ($addInput) {

							var $lineSearch = element.create("div", {
								"attr"	:	{
									"style"	:	"margin-top:10px"
								},
							});
								
							$lineSearch.append($addInput);
							
							groupsForm.append($lineSearch);
							
						}
						
						groupsForm.append($itemList);
						
						line.prepend(toolbarLeft);
						
						var $itemsData = [];

						if (d?.["data"]?.["items"]) {//є товари
							for (var i = 0; i < d["data"]["items"].length; i++) {//обходимо дані
								
								$itemsData.push(d["data"]["items"][i]["ID"]);
								let $item = shopTools.itemToolbarRenderItem(d["data"]["items"][i], "suffix1");
								
								$itemList.append($item);
								
							}
							
						}
						
						if ($itemsData) {
							
							input.value = $itemsData.join(",");
							
						}

					} else {
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					}
				}
				
			);
		}
		
		return block;
	}
	
	itemToolbarAdd(o) {
		
		let $searchInput = o.closest("[data-type='form']").querySelector("[data-action='item-toolbar-search']");
		
		if ($searchInput.getAttribute("type") == "hidden") {
			
			$searchInput.setAttribute("type", "text");
			$searchInput.focus();
			
		} else {
			
			$searchInput.setAttribute("type", "hidden");
			$searchInput.value = "";
		} 

		o.classList.toggle("active");

	}
	
	itemToolbarSaveBtn(o) {
		
		var formO = o.closest("[data-type='form']");
		
		shopTools.itemToolbarDataSave(form.returnData(formO), formO);
	}

	itemToolbarSerialize(o) {
		
		let $itemInput = o.closest("[data-type='form']").querySelector("[data-name='items']");
		let $itemList = o.closest("[data-type='form']").querySelector(".itemList");
		
		if ($itemInput && $itemList) {
			
			var $data = sortable.serialize($itemList);

			if ($data) {

				sortable.deMake($itemList, o.previousElementSibling);
				
				$itemInput.value = $data.join(",");

				let $saveBtn = o.closest("[data-type='form']").querySelector("[data-action='item-toolbar-save']");
				
				if ($saveBtn) {//знайшли кнопку зберігання
					$saveBtn.click();//клікнули
				}
			}	
		}

	}

	itemToolbarDataSave(data, formO) {
		
		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"itemToolbarDataSave",
			},
			data	:	data,
		};
		
		ajax.start(args, formO).then(
		
			function(d) {
				
				d = ajax.end(d, formO);
				
				if(d["info"]["success"]) {//успішно
					
					vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
					
				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);
		
	}

	itemToolbarDelete(o) {

		var $item = o.closest(".item");
		var $ID = $item.getAttribute("data-id");

		var $table = o.closest("[data-type='form']").querySelector("[data-name='table']");
		var $input = o.closest("[data-type='form']").querySelector("[data-name='items']");

		var $count = o.closest("[data-type='form']").querySelector("div.count");
			
		if (
			$ID
			&& $table
			&& $table.value
			&& $input
			&& $input.value
			&& $count
		) {
			
			var $items = $input.value.split(",");
			var $index = $items.indexOf($ID); 
			
			if ($index !== -1) {//знайшли
				
				$items.splice($index, 1);
				$input.value = $items.join(",");
				
				$item.remove();
				$count.innerHTML = $items.length;
			}
		}
		
	}

	itemToolbarRenderItem(item, suffix) {

		let $name, $image, $code, $codeAttr;
		
		let $deleteBtn = element.create("button", {
			"class"	:	["la", "la-16", "h-24", "la-minus"],
			"attr"	:	{
				"type"		:	"button",
				"onclick"	:	"shopTools.itemListToolbarDelete(this,'"+suffix+"')",
				"title"		:	library.get("Delete")
			}
		});
		
		let $item = element.create("div", {
			"class"	:	"item",
			"attr"	:	{
				"data-id"	:	item["ID"]
			}
		});

		if (item?.["image"]) {
			
			$image = element.create("div", {
				"attr"	:	{
					"class"		:	"image",
					"style"		:	"background-image:url("+item["image"]+"?"+Date.now()+")",
				}
			});
			
			$item.append($image);
		}

		$item.append($deleteBtn.cloneNode(true));

		$codeAttr = {
			"class"	:	"code",
			"html"	:	"ID: " + item["ID"],
		};
		
		/*if (item?.["extID"]) {
			
			$codeAttr["html"] += "<span class='small'>, extID: "+ item["extID"];
		}*/
		
		$code = element.create("div", $codeAttr);
		
		$item.append($code);

		$name = element.create("div", {
			"class"	:	"name",
			"html"	:	item["name"],
		});
		
		$item.append($name);
		
		return $item; 
	}
	
	itemToolbarSearchByID(o, table) {
		
		o.value = ""; o.removeAttribute("onfocus");

		let $fieldValue = o.closest("[data-type='form']").querySelector("[data-name='items']").value;

		autocomplete({
			input: o,
			minLength: 1,
			debounceWaitMs:200,
			preventSubmit:true,
			
			fetch: function(text, callback) {

				var args = {
					h	:	"exec",
					a	:	{
						"name"		:	"searchItems",//method
						"text"		:	text,
						"work"		:	1
					},
					value	:	$fieldValue
				};

				ajax.start(args).then(
				
					function(d) {
						
						d = ajax.end(d);
						
						if (d["info"]["success"]){
							
							callback(d["data"]);

						} /*else {
							vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						}*/
					}
					
				);
			},
			
			render: function(item, value) {
				
				var itemElement = document.createElement("div");
				var regex = new RegExp(value, 'gi');
				var inner = item[1].replace(regex, function(match) { return "<strong>" + match + "</strong>" });
				itemElement.innerHTML = inner;
				return itemElement;
				
			},
			
			emptyMsg: library.get("Nothing Was Found"),
			
			onSelect: function(item, inputfield) {
				
				let $itemList = inputfield.closest("[data-type='form']").querySelector(".itemList");
				
				let $field = inputfield.closest("[data-type='form']").querySelector("[data-name='items']");
				
				let $countElem = inputfield.closest("[data-type='form']").querySelector("div.count");
				
				inputfield.value = "";
				shopTools.itemToolbarInnerItem($itemList, $field, $countElem, item[0]);
				//врізаємо асинхронним методом

			}
		});
		
	}

	itemToolbarInnerItem(itemList, field, countElem, ID) {
		//renderItemItem раніше
		var args = {
			h	:	"exec",
			a	:	{
				"name"		:	"getItemByID",//method
				"ID"		:	ID,
				"work"		:	1,
			}
		};

		ajax.start(args).then(
		
			function(d) {
				
				d = ajax.end(d);
				
				if (d["info"]["success"]) {
					
					if (field && itemList) {
						
						let suffix = field.getAttribute("name");
						
						d["data"]["ID"] = ID;
						let $item = shopTools.itemToolbarRenderItem(d["data"], suffix);
						itemList.append($item);
						
						var $items = field.value.split(",");
						
						if ($items.length == 1 && $items[0] == "") {
							
							$items.splice(0, 1);
							
						}

						$items.push(ID);
						
						field.value = $items.join(",");
						countElem.innerHTML = $items.length;
					}

				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);	
	}
	
	/*####################*/

	searchItems(o, type) {

		o.value = ""; o.removeAttribute("onfocus");

		let $field = o.closest(".block").querySelector("[name='"+type+"']");//поле для зберігання даних
		
		autocomplete({
			input: o,
			minLength: 1,
			debounceWaitMs:200,
			preventSubmit:true,
			
			fetch: function(text, callback) {

				var args = {
					h	:	"exec",
					a	:	{
						"name"		:	"searchItems",//method
						"text"		:	text,
						"work"		:	1
					},
					value	:	$field.value,
				};

				ajax.start(args).then(
				
					function(d) {
						
						d = ajax.end(d);
						
						if (d["info"]["success"]){
							
							callback(d["data"]);

						} else {
							vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						}
					}
					
				);
			},
			
			render: function(item, value) {
				
				var itemElement = document.createElement("div");
				var regex = new RegExp(value, 'gi');
				var inner = item[1].replace(regex, function(match) { return "<strong>" + match + "</strong>" });
				itemElement.innerHTML = inner;
				return itemElement;
				
			},
			
			emptyMsg: library.get("Nothing Was Found"),
			
			onSelect: function(item, inputfield) {
				
				let $itemList = inputfield.closest(".block").querySelector(".itemList");
				let $countElem = inputfield.closest(".block").querySelector("div.count");

				inputfield.value = "";//очищаємо пошуковий блок
				
				shopTools.itemToolbarInnerItem($itemList, $field, $countElem, item[0]);
				//врізаємо асинхронним методом

			}
		});
		
	}
	
	itemListToolbar(config, block) {
		
		var $table = config["table"];
		var $field = block.querySelector("[name='"+config["field"]+"']");
		var $fieldValue = $field.value;
		let $ID = parseInt(config["ID"]);

		if (!isNaN($ID)) {//при редагуванні

			var args = {
				h	:	"exec",
				a	:	{
					"name"		:	"itemListToolbarDataGet",//method
					"work"		:	1
				},
				p	:	{
					//"table"			:	$table,
					"fieldValue"	:	$fieldValue,
				},
			};
			
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);
					
					if (d["info"]["success"]) {
						
						var line = element.create("div", {
							"class"	:	"line"
						});

						block.append(line);

						var toolbarLeft = element.create("div", {
							"class"	:	"toolbar"
						});
						
						var $addButton = element.create("button", {
							
							"class"	:	["la", "la-24", "la-plus", "h-40"],
							"attr"	:	{
								"type":			"button",
								"title":		library.get("Add") + " " + library.get("List Items"),
								"onclick"	:	"shopTools.itemListToolbarAdd(this)"
							}
							
						});
						
						var $addInput = element.create("input", {
							"attr"	:	{
								"onfocus"		:	"shopTools.searchItems(this,'"+config["field"]+"')",
								"type"			:	"hidden",
								"data-action"	:	"itemslist-toolbar-search",
								"placeholder"	:	library.get("Start Writing")+", ID"
							}
						});
						
						$addInput.addEventListener("keypress", function() {
							
							if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
								event.preventDefault();
							}
							
						});
						
						var $deleteBtn = element.create("button", {
							"class"	:	["la", "la-16", "h-24", "la-minus"],
							"attr"	:	{
								"type"		:	"button",
								"onclick"	:	"shopTools.itemListToolbarDelete(this, '"+config["field"]+"')",
								"title"		:	library.get("Delete") + " " + library.get("List Item")
							}
						});
						
						var count = d["data"]["count"];
						
						toolbarLeft.append(element.create("div",{
							"class"	:	"count",
							"html"	:	count
						}));
						
						toolbarLeft.append($field);
						toolbarLeft.append($addButton);
						
						line.append(toolbarLeft);
						
						block.append($addInput);
						
						var $itemList = element.create("div", {
							"class"	:	"itemList"
						});
						
						block.append($itemList);
						
						if (count) {//є збережені товари
							
							var $item, $name, $image, $code, $codeAttr;
							var $items = d["data"]["items"];
							
							for (var i = 0; i < $items.length; i++) {//обходимо дані
								
								$item = element.create("div", {
									"class"	:	"item",
									"attr"	:	{
										"data-id"	:	$items[i]["ID"]
									}
								});

								if ($items[i]?.["image"]) {
									
									$image = element.create("div", {
										"attr"	:	{
											"class"		:	"image",
											"style"		:	"background-image:url("+$items[i]["image"]+"?"+Date.now()+")",
										}
									});
									
									$item.append($image);
								}

								$item.append($deleteBtn.cloneNode(true));
								
								$codeAttr = {
									"class"	:	"code",
									"html"	:	"ID: " + $items[i]["ID"],
								};
								
								/*if ($items[i]["extID"]) {
									$codeAttr["html"] += "<span class='small'>, extID: "+ $items[i]["extID"];
								}*/
								
								$code = element.create("div", $codeAttr);
								
								$item.append($code);

								$name = element.create("div", {
									"class"	:	"name",
									"html"	:	$items[i]["name"]
								});
								
								$item.append($name);
								
								$itemList.append($item);
								
							}
							
						}
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);
			
		}
		
		return block;

	}
	
	itemListToolbarAdd(o) {
		
		var $searchInput = o.closest(".block").querySelector("[data-action='itemslist-toolbar-search']");
		
		if ($searchInput.getAttribute("type") == "hidden") {
			
			$searchInput.setAttribute("type", "text");
			$searchInput.focus();
			
		} else {
			
			$searchInput.setAttribute("type", "hidden");
			$searchInput.value = "";
		} 

		o.classList.toggle("active");

	}

	itemListToolbarDelete(o, name) {
		
		var $item = o.closest(".item");
		var $ID = $item.getAttribute("data-id");
		var $input = o.closest(".block").querySelector("[name='"+name+"']");
		var $count = o.closest(".block").querySelector("div.count");
		
		if ($ID && $input && $input.value && $count) {
			
			var $items = $input.value.split(",");
			var $index = $items.indexOf($ID); 
			
			if ($index !== -1) {//знайшли
				
				$items.splice($index, 1);
				$input.value = $items.join(",");
				
				$item.remove();
				$count.innerHTML = $items.length;
			}
		}
		
	}	

	/*####################*/
	
	priceListToolbar(config, block) {
		
		var $table = config["table"];
		var $field = block.querySelector("[name='"+config["field"]+"']");
		var $fieldValue = $field.value;
		let $ID = parseInt(config["ID"]);

		if (!isNaN($ID)) {//при редагуванні

			var args = {
				h	:	"exec",
				a	:	{
					"name"		:	"priceListToolbarDataGet",//method
					"work"		:	1
				},
				p	:	{
					"fieldValue"	:	$fieldValue,
				},
			};
			
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);
					
					if (d["info"]["success"]) {
						
						var line = element.create("div", {
							"class"	:	"line"
						});

						block.append(line);

						var toolbarLeft = element.create("div", {
							"class"	:	"toolbar"
						});
						
						var $addButton = element.create("button", {
							
							"class"	:	["la", "la-24", "la-plus", "h-40"],
							"attr"	:	{
								"type":			"button",
								"title":		library.get("Add") + " " + library.get("List Items"),
								"onclick"	:	"shopTools.priceListToolbarAdd(this)"
							}
							
						});
						
						var $addInput = element.create("input", {
							"attr"	:	{
								"onfocus"		:	"shopTools.searchPrices(this, '"+config["field"]+"')",
								"type"			:	"hidden",
								"data-action"	:	"pricelist-toolbar-search",
								"placeholder"	:	library.get("Start Writing")
							}
						});
						
						$addInput.addEventListener("keypress", function() {
							
							if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
								event.preventDefault();
							}
							
						});
						
						var $deleteBtn = element.create("button", {
							"class"	:	["la", "la-16", "h-24", "la-minus"],
							"attr"	:	{
								"type"		:	"button",
								"onclick"	:	"shopTools.priceListToolbarDelete(this, '"+config["field"]+"')",
								"title"		:	library.get("Delete") + " " + library.get("Price")
							}
						});
						
						var count = d["data"]["count"];
						
						toolbarLeft.append(element.create("div",{
							"class"	:	"count",
							"html"	:	count
						}));
						
						toolbarLeft.append($field);
						toolbarLeft.append($addButton);
						
						line.append(toolbarLeft);
						
						block.append($addInput);
						
						var $itemList = element.create("div", {
							"class"	:	["itemList", "no-image"]
						});
						
						block.append($itemList);
						
						if (count) {//є збережені ціни
							
							var $item, $name, $image, $code;
							var $items = d["data"]["items"];
							
							for (var i = 0; i < $items.length; i++) {//обходимо дані
								
								$item = element.create("div", {
									"class"	:	"item",
									"attr"	:	{
										"data-id"	:	$items[i]["ID"]
									}
								});

								$item.append($deleteBtn.cloneNode(true));
								
								$name = element.create("div", {
									"class"	:	"name",
									"html"	:	$items[i]["name"]
								});
								
								$item.append($name);
								
								$itemList.append($item);
								
							}
							
						}
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);
			
		}
		
		return block;
	}
	
	priceListToolbarAdd(o) {
		
		var $searchInput = o.closest(".block").querySelector("[data-action='pricelist-toolbar-search']");
		
		if ($searchInput.getAttribute("type") == "hidden") {
			
			$searchInput.setAttribute("type", "text");
			$searchInput.focus();
			
		} else {
			
			$searchInput.setAttribute("type", "hidden");
			$searchInput.value = "";
		} 

		o.classList.toggle("active");

	}
	
	priceListToolbarDelete(o, name) {
		
		var $item = o.closest(".item");
		var $ID = $item.getAttribute("data-id");
		var $input = o.closest(".block").querySelector("[name='"+name+"']");
		var $count = o.closest(".block").querySelector("div.count");
		
		if ($ID && $input && $input.value && $count) {
			
			var $items = $input.value.split(",");
			var $index = $items.indexOf($ID); 
			
			if ($index !== -1) {//знайшли
				
				$items.splice($index, 1);
				$input.value = $items.join(",");
				
				$item.remove();
				$count.innerHTML = $items.length;
			}
		}
		
	}		
	
	searchPrices(o, field) {
		
		o.value = "";
		o.removeAttribute("onfocus");

		autocomplete({
			input: o,
			minLength: 1,
			debounceWaitMs:200,
			preventSubmit:true,
			
			fetch: function(text, callback) {

				var args = {
					h	:	"exec",
					a	:	{
						"name"		:	"searchPrices",//method
						"text"		:	text,
						"work"		:	1
					}
				};

				ajax.start(args).then(
				
					function(d) {
						
						d = ajax.end(d);
						
						if (d["info"]["success"]){
							
							callback(d["data"]);

						} else {
							vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						}
					}
					
				);
			},
			
			render: function(item, value) {

				var itemElement = document.createElement("div");
				var regex = new RegExp(value, 'gi');
				var inner = item["name"].replace(regex, function(match) { return "<strong>" + match + "</strong>" });
				itemElement.innerHTML = inner;
				return itemElement;
				
			},
			
			emptyMsg: library.get("Nothing Was Found"),
			
			onSelect: function(item, inputfield) {

				var $itemList = inputfield.closest(".block").querySelector(".itemList");
				
				var $field = inputfield.closest(".block").querySelector("[name='"+field+"']");
				
				var $count= inputfield.closest(".block").querySelector("div.count");

				shopTools.renderPriceItem(item, $itemList, $field, $count, field);
				
				o.value = "";
			}
		});
		
	}

	renderPriceItem(item, itemList, field, count, fieldName) {
		
		if (item && field && itemList) {

			
			var $itemListArray = [];
			
			if (field.value) {
				
				$itemListArray = field.value.split(",");
			
			}
			
			if ($itemListArray.includes(item["ID"])) {
				
				vNotify.error({
					text	:	library.get("On Double"),
					visibleDuration	:	5000,
					position	:	"center",
				});
				
			} else {

				var $item = element.create("div", {
					"class"	:	"item",
					"attr"	:	{
						"data-id"	:	item["ID"]
					}
				});

				var $deleteBtn = element.create("button", {
					"class"	:	["la", "la-16", "h-24", "la-minus"],
					"attr"	:	{
						"type"		:	"button",
						"onclick"	:	"shopTools.priceListToolbarDelete(this, '"+fieldName+"')",
						"title"		:	library.get("Delete") + " " + library.get("Price")
					}
				});
				
				$item.append($deleteBtn);

				var $name = element.create("div", {
					"class"	:	"name",
					"html"	:	item["name"]
				});
				
				$item.append($name);
				
				itemList.append($item);
			
				$itemListArray.push(item["ID"]);
				
				field.value = $itemListArray.join(",");
				
				count.innerHTML = $itemListArray.length;
			}

		}
	}

	/*markUpToolbar----------------*/

	markUpToolbar(config, block) {
		
		let field = block.querySelector("[name='"+config["field"]+"']");//оригінальний контрол
		let fieldValue = field.value;
		let ID = parseInt(config["ID"]);
		let entity = config["entity"];
		
		if (!isNaN(ID)) {//при редагуванні

			var args = {
				h	:	"exec",
				a	:	{
					"name"		:	"markUpToolbarDataGet",//method
					"work"		:	1
				},
				p	:	{
					"entity"		:	entity,
					"fieldValue"	:	fieldValue,
				},
			};

			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);
					
					if (d["info"]["success"]) {
						
						let line = element.create("div", {
							"class"	:	"line",
						});
					
						block.append(line);

						let toolbarLeft = element.create("div", {
							"class"	:	"toolbar",
							"attr"	:	{
								"style"	:	"width:60%"
							},
						});
						
						var $addButton = element.create("button", {
							
							"class"	:	["la", "la-24", "la-plus", "h-40"],
							"attr"	:	{
								"type":			"button",
								"title":		library.get("Add") + " " + library.get("Mark Up")+" "+tools.capitalize(entity),
								"onclick"	:	"shopTools.markUpToolbarItemAdd(this, '"+entity+"')"
							}
							
						});

						let count = d["data"]["count"];
						
						toolbarLeft.append(element.create("div",{
							"class"	:	"count",
							"attr"	:	{
								"style"	:	"margin:0;",
							},
							"html"	:	count,
						}));
						
						toolbarLeft.append(field);
						
						toolbarLeft.append($addButton);

						line.append(toolbarLeft);

						let itemList = element.create("div", {
							"class"	:	["itemList", "markUp"],
							"attr"	:	{
								"data-entity"	:	entity,
							},
						});
						
						block.append(itemList);
						
						if (count) {//є збережені в базі сутності
							
							let $list = d["data"]["list"];
							let items = d["data"]["items"];

							for (let j = 0; j < $list[0].length; j++) {

								let item = shopTools.markUpToolbarItemRender(entity, $list[0][j], $list[1][j], items, field, config["field"]);
								
								itemList.append(item);
							}

						}
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);
			
		}
		
		return block;
	}
	
	markUpToolbarItemRender(entity, persent, roster, items, field, fieldName) {

		let name;
		let item = element.create("div", {
			"class"	:	"item",
/*			"attr"	:	{
				"data-persent"	:	persent
			}*/
		});
		
		let itemAddButton = element.create("button", {
			"class"	:	["la", "la-16", "h-24", "la-plus"],
			"attr"	:	{
				"type"		:	"button",
				"onclick"	:	"shopTools.markUpToolbarItemRowAdd(this)",
				"title"		:	library.get("Add") + " " + library.get("Mark Up Item")+ " "+library.get("Row")+" "+library.get(tools.capitalize(entity)),
			}
		});
		
		let itemDeleteButton = element.create("button", {
			"class"	:	["la", "la-16", "h-24", "la-minus"],
			"attr"	:	{
				"type"		:	"button",
				"onclick"	:	"shopTools.markUpToolbarItemDelete(this)",
				"title"		:	library.get("Delete") + " " + library.get("Mark Up Item")+" "+ library.get(tools.capitalize(entity)),
			}
		});
		
		let addInput = element.create("input", {
			"class"			:	["search", "displayNone"],
			"attr"	:	{
				"onfocus"		:	"shopTools.markUpToolbarItemSearch(this ,'"+entity+"', '"+fieldName+"')",
				"placeholder"	:	library.get("Start Writing")
			}
		});

		addInput.addEventListener("keypress", function() {
			
			if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
				event.preventDefault();
			}
			
		});
		
		item.append(addInput);
		item.append(itemAddButton);
		item.append(itemDeleteButton);

		/*let persentInput = element.create("input", {
			"value"	:	persent,
			"attr"	:	{
				"data-valid"	:	"positiveNumber|0",
			},
			"class"	:	"makeUpPersent",
			"html"	:	"%",
		});*/
		
		let persentInput = element.create("input", {
			"value"	:	persent,
			"attr"	:	{
				"type"	:	"number",
				"step"	:	"0.1",
				"min"	:	"-99.9",
				"max"	:	"99.9",
			},
			"class"	:	"makeUpPersent",
			"html"	:	"%",
		});
		
		let persentHtml = element.create("span",{
			"html"	:	"%",
		})

		persentInput.addEventListener("input", function() {

			let itemList = event.target.closest(".itemList");
			shopTools.markUpToolbarControlFormed(itemList);
		});
		
		persentInput.addEventListener("keypress", function() {
			
			if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
				event.preventDefault();
				
				/*var toValid = {
					el		:	event.target,
					value	:	event.target.value,
					valid	:	["number|0"],//число або нуль
				};

				if (valid.start(toValid)) {
				
					console.log("valid");
				
				} else {
					console.log("not valid");
				}
				
				event.target.addEventListener("input", function () {
					
					form.runDynamicValid(event.target);
					
				});*/
			}
			
		});
		
		let persentGroup = element.create("div", {
			"class"	:	"persentGroup",
		});
		
		let persentPersent = element.create("div", {
			"class"	:	"persentPersent",
		});
		
		persentPersent.append(persentInput);
		persentPersent.append(persentHtml);
		
		let persentEntity = element.create("ol", {
			"class"	:	"persentEntity",
		});
		
		if (roster !== null) {
			for (let i = 0; i < roster.length; i++) {
				
				name = element.create("li", {
					"class"	:	"name",
					"html"	:	"<button type='button' class='delete' title='Видалити "+items[roster[i]]+"' onclick='shopTools.markUpToolbarItemRowDelete(this)'>—</button>"+items[roster[i]]+"<span class='small'>, ID: "+roster[i]+"</span>",
					"attr"	:	{
						"data-id"	:	roster[i],
					},
				});
				persentEntity.append(name);
			}
		
		}
		
		persentGroup.append(persentPersent);
		persentGroup.append(persentEntity);
		
		item.append(persentGroup);

		return item;
	}
	
	markUpToolbarItemAdd(o, entity) {
		
		/*Додавання пустого стартового блоку*/
		let itemList = o.closest(".block").querySelector(".itemList[data-entity='"+entity+"']");
		
		if (itemList) {

			let field = o.previousElementSibling;
			let fieldName = field.getAttribute("name");
			
			let item = shopTools.markUpToolbarItemRender(entity, "1", null, null, field, fieldName);
			/*об'єкт, name*/
			itemList.append(item);
		}
	}

	markUpToolbarItemRowAdd(o) {
		
		let search = o.closest(".item").querySelector(".search");
		
		if (search) {
			
			search.classList.toggle("displayNone");
			
			if (!search.classList.contains("displayNone")) {//видиме поле пошуку
				search.focus();
				o.classList.add("searched");
			} else {//невидиме поле пошуку
				o.classList.remove("searched");
			}
		}

	}
	
	markUpToolbarItemRowDelete(o) {
		
		let item = o.closest(".item");
		let itemList = item.closest(".itemList");
		let persent = item.querySelector(".makeUpPersent").value;

		let li = o.closest("li");
		let entityID = li.getAttribute("data-id");

		let field = o.closest(".block").querySelector("input[name]");
		let fieldValue = field.value;
		
		if (fieldValue) {

			let obj = JSON.parse(fieldValue);
			
			if (obj[persent]) {
				
				let backup = obj[persent];
				obj[persent] = obj[persent].filter(item => item !== entityID);

				if (backup != obj[persent]) {
					li.remove();//видалили рядок, якщо змінився масив, тобто зменшився в даному випадку
				}
				
				if (obj[persent].length === 0) {
					item.remove();//видалили .item
				}
				
				shopTools.markUpToolbarControlFormed(itemList);

			}

		}

	}
	
	markUpToolbarItemDelete(o) {

		let item = o.closest(".item");
		let itemList = item.closest(".itemList");
		
		item.remove();//видалили .item
		
		shopTools.markUpToolbarControlFormed(itemList);
	}
	
	markUpToolbarItemSearch(o, entity, fieldName) {

		o.value = "";
		o.removeAttribute("onfocus");
		let field = o.closest(".block").querySelector("[name='"+fieldName+"']");//оригінальний контрол

		let fieldValue = field.value;

		autocomplete({
			input: o,
			minLength: 1,
			debounceWaitMs:200,
			preventSubmit:true,
			
			fetch: function(text, callback) {

				var args = {
					h	:	"exec",
					a	:	{
						"name"		:	"markUpToolbarItemSearch",//method
						"work"		:	1
					},
					p:	{
						text	:	text,
						value	:	fieldValue,
						entity	:	entity,
					}
				};

				ajax.start(args).then(
				
					function(d) {
						
						d = ajax.end(d);
						
						if (d["info"]["success"]){
							
							callback(d["data"]);

						} else {
							vNotify.error({
								text: d["info"]["text"],
								visibleDuration:10000,
								position: "center",
							});
						}
					}
					
				);
			},
			
			render: function(item, value) {

				let itemElement = document.createElement("div");
				let regex = new RegExp(value, 'gi');
				let inner = item["name"].replace(regex, function(match) { return "<strong>" + match + "</strong>" });

				inner += ", <span class='small'>ID: "+item["ID"]+"</span>";
				itemElement.innerHTML = inner;
				return itemElement;
				
			},
			
			emptyMsg: library.get("Nothing Was Found"),
			
			onSelect: function(item, inputfield) {
				
				let persentEntity = inputfield.closest(".item").querySelector(".persentEntity");
				let itemList = inputfield.closest(".itemList");
				
				if (persentEntity) {

					let li = element.create("li", {
						"class"	:	"name",
						"html"	:	"<button type='button' class='delete' title='Видалити "+item["name"]+"'>—</button>"+item["name"]+"<span class='small'>, ID: "+item["ID"]+"</span>",
						"attr"	:	{
							"data-id"	:	item["ID"],
							"onclick"	:	"shopTools.markUpToolbarItemRowDelete(this)",
						},
					});
					
					persentEntity.append(li);
					inputfield.value = "";
					
					shopTools.markUpToolbarControlFormed(itemList);
				}
			}
		});
		
	}

	markUpToolbarControlFormed(itemList) {
		
		let i, j, data, persent, entities, fieldValue;
		let items = itemList.querySelectorAll(".item");
		let field = itemList.closest(".block").querySelector("input[name]");

		if (items) {
			data = {};
			for (i = 0; i < items.length; i++) {
				
				persent = items[i].querySelector("input.makeUpPersent").value;
				entities = items[i].querySelectorAll(".persentEntity > li.name");
				
				if (entities) {
					data[persent] = [];
					for (j = 0; j < entities.length; j++) {

						data[persent].push(entities[j].getAttribute("data-id"));
					}

				}

			}
			
			if (data) {
				
				fieldValue = JSON.stringify(data);
				if (fieldValue == "{}") {//якщо об'єкт пустий, очистили повністю рядок
					fieldValue = "";
					
				}
				field.value = fieldValue;
			}
		}
	}
	
	
	/*\markUpToolbar----------------*/

	generateNewPriceCode(itemID, block) {
		
		/*генерація артикулу товара*/
		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"generateNewPriceCode",
			},
			itemID	:	itemID,
		};
		
		ajax.start(args).then(
		
			function(d) {
				
				d = ajax.end(d);

				if (d["info"]["success"]) {//успішно
	
					var input = block.querySelector("[data-name='code']").value = d["code"];

				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);

	}

	optionToolbar(config, block) {

		/*Управління властивостями товара*/
		
		while (block.firstChild) {//видаляємо всі дочірні елементи
			
			block.removeChild(block.firstChild);
			
		}

		let ID = parseInt(config["ID"]);
		let tableName = config["table"];

		if (!isNaN(ID)) {//при редагуванні
			
			var args = {
				h	:	"exec",
				a	:	{
					"name"	:		"getOptionToolbarData",
					"work"		:	1,
					"p"			:	{
						"table"	:		tableName,
						"parent"	:	ID,
						"group"		: config["group"]
					},
				}
			};

			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);
					
					if (d["info"]["success"]) {
						
						/*вже є, як мінімум, права на перегляд*/
						
						var line = element.create("div", {
							"class"	:	"line"
						});
						
						var toolbarLeft = element.create("div", {
							"class"	:	"toolbar"
						});
						
						var reloadButton = element.create("button", {
							
							"class"	:	["la", "la-24", "la-refresh", "h-40"],
							"attr"	:	{
								"type":			"button",
								"title":		library.get("Reload") + " " + library.get("Options"),
								"data-action":	"option-toolbar-reload",
							}
							
						});
						
						var callbackF = function(p1, p2) {
							
							return function() {
								
								shopTools.optionToolbar(p1, p2);
								
							};
							
						};
						
						reloadButton.addEventListener("click", callbackF(config, block));
						toolbarLeft.append(reloadButton);

						var groupsForm = element.create("div", {
							"class"	:	"groups",
							"attr"	:	{
								"data-type"	:	"form"
							}
						});
						
						groupsForm.append(line);
						
						groupsForm.append(element.create("input", {"attr":{"type":"hidden","data-name":"table"},"value":tableName}));
						groupsForm.append(element.create("input", {"attr":{"type":"hidden","data-name":"parent"},"value":ID}));

						if (d?.["permission"] && d["permission"] == "1111") {//повинні бути права на все
							
							var saveButton = element.create("button", {
								
								"class"	:	["la", "la-24", "la-save", "h-40"],
								"attr"	:	{
									"type":			"button",
									"title":		library.get("Save") + " " + library.get("Options"),
									"data-action":	"option-toolbar-save",
									"onclick"	:	"shopTools.saveOptionToolbarDataBtn(this)"
								}
								
							});
							
							toolbarLeft.append(saveButton);
							
						}
						
						toolbarLeft.append(element.create("div", {
							"class"	:	["bg-pink", "disabled", "h-40"], 
							"html"	:	library.get("Options"),
							"attr"	:	{
								"data-action"	:	"info",
							}
						}));
						
						var count = 0;
						var countOptionSet = 0;

						if (d?.["data"]?.["optionSet"]?.length) {
							
							count = d["data"]["optionSet"].length;
						}
						
						toolbarLeft.append(element.create("div",{
							
							"class"	:	"count",
							"html"	:	count
							
						}));
						
						line.prepend(toolbarLeft);
						
						block.append(groupsForm);
						
						if (d?.["data"]?.["optionSet"]) {

							var item, header, headerText, option, tag, attr, list, action;
							var types = ["2", "3"];
							
							var hrefStart = "/p/run/";
							var actionStart = {
								h: "table",
								a:{
									"name"		:	"optionList",
									"action"	:	"view",
									"filter"	:	{
										
									},
									"sort"		:	{
										"fakeFieldName" : "ASC"
									},
									//"mode"		:	"toModal",

								}
							};
							for (var i = 0; i < d["data"]["optionSet"].length; i++) {

								attr = {
									"attr"	:	{
										"data-name"	:	"pr-" + d["data"]["optionSet"][i]["ID"]
									}
								};
								item = element.create("div", {"class"	:	"block"});
								
								headerText = d["data"]["optionSet"][i]["name"];
								
								if (types.includes(d["data"]["optionSet"][i]["type"])) {
									
									action = actionStart;
									action["a"]["filter"] = {"parent" : d["data"]["optionSet"][i]["ID"]};
									
									//action["a"]["elementID"] = "row-optinList-add-"+d["data"]["optionSet"][i]["ID"];
									
									headerText += "<a href='"+hrefStart+tools.transformObjToStr(action)+"' target='_blank' class='btn disabled fr la la-16 la-plus h-24' title='Додати значення'></a>";
									// onclick='run.go(this, {class:\"RunTools\", method:\"rowAdd\"});return false'

								}

								if (d["data"]["optionSet"][i]["valueAfter"]) {
									
									headerText += " <span class='small fr'>["+d["data"]["optionSet"][i]["valueAfter"]+"]</span>";
								
								}

								header = element.create("div", {
									"class"	:	"header",
									"html"	:	headerText
								});
								
								item.append(header);
								
								if (types.includes(d["data"]["optionSet"][i]["type"])) {//списки
									
									tag = "select";
									
									option = [];

									if (d["data"]["optionSet"][i]["type"] == 2) {//вибір одного значення
										
										option.push({
											"value"	:	"",
											"html"	:	"—",
										});
										
									}

									if (d?.["data"]["optionList"]?.[d["data"]["optionSet"][i]["ID"]]) {
										
										list = d["data"]["optionList"][d["data"]["optionSet"][i]["ID"]];
										
										for (var j = 0; j < list.length; j++) {
											
											option.push({
												"value"	:	list[j][0],
												"html"	:	list[j][1],
											});
										}
									}
									

									attr["option"] = option;
									
									if (d["data"]["optionSet"][i]["type"] == 3) {
										
										attr["multiple"] = true;

									}
								
								} else {
									
									tag = "input";
									
									attr["attr"]["type"] = "text";
									
								}

								var input = element.create(tag, attr);
								
								item.append(input);
								
								if (d["data"]["optionSet"][i]["attr"]) {
									
									var attr =  element.create("span", {
										"attr"	:	{
											"style"	:	"margin-top:5px;display:inline-block; color:#a9a9a9"
										},
										"class"	:	["small"],
										"html"		:	d["data"]["optionSet"][i]["attr"],
										
									});
									
									item.append(attr);
								
								}

								switch (d["data"]["optionSet"][i]["type"]) {
									
									case "1":/*значення*/

										if (d?.["data"]?.["option"]?.[d["data"]["optionSet"][i]["ID"]]) {
											
											input.value = d["data"]["option"][d["data"]["optionSet"][i]["ID"]][0];
											
										}

										input.addEventListener("keypress", function() {
											
											if (event.keyCode == 13) {//на ентер відмінили відправку головної форми
												event.preventDefault();
												var formO = event.target.closest("[data-type='form']");
												shopTools.saveOptionToolbarData(form.returnData(formO), formO);
											}
											
										});
										
									break;
									
									case "2":/*один. вибір*/
									
										if (d?.["data"]?.["option"]?.[d["data"]["optionSet"][i]["ID"]]) {
											
											input.value = d["data"]["option"][d["data"]["optionSet"][i]["ID"]][0];
											
										}
										
										var select = new SlimSelect({
											select	:	input,
										});
										
									break;
									
									case "3": /*мн. вибір*/
									
										if (input.querySelector("option")) {
											
											input.querySelector("option").selected = false;
											
										}

										if (d?.["data"]?.["option"]?.[d["data"]["optionSet"][i]["ID"]]) {
											
											list = d?.["data"]?.["option"]?.[d["data"]["optionSet"][i]["ID"]];
											
											var tmp;
											
											for (var iList = 0; iList < list.length; iList++) {
												
												tmp = input.querySelector("option[value='" + list[iList] + "']");
												
												if (tmp) {
													input.querySelector("option[value='" + list[iList] + "']").selected = true;
												}
											}
											
										}
										
										var select = new SlimSelect({
											select			:	input,
											closeOnSelect	:	false,
										});
										
									break;
								}
								
								groupsForm.append(item);
							}
							
							var lineBottom = line.cloneNode(true);
							lineBottom.style.marginTop = "20px";
							
							var reloadButtonBottom = lineBottom.querySelector("[data-action='option-toolbar-reload']");
							
							var callbackF = function(p1, p2) {
								
								return function() {
									
									shopTools.optionToolbar(p1, p2);
									
								};
								
							};
							
							reloadButtonBottom.addEventListener("click", callbackF(config, block));
						
							groupsForm.append(lineBottom);
							
						}
						
					} else {
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					}
				}
			);
			

		}
		
		block.style.width = "100%";

	}
	
	saveOptionToolbarData(data, formO) {

		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"saveOptionToolbarData",
			},
			data	:	data,
		};
		
		ajax.start(args, formO).then(
		
			function(d) {
				
				d = ajax.end(d, formO);
				
				if(d["info"]["success"]) {//успішно
					
					vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
					
				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);
	}
	
	saveOptionToolbarDataBtn (o) {
		
		var formO = o.closest("[data-type='form']");
		
		shopTools.saveOptionToolbarData(form.returnData(formO), formO);
		
	}
	
	saveAllRowEdit(o) {

		var rowEditForm = o.closest("form");
		
		var listBtns = [//кнопки, на які треба послідовно клікнути
			"[data-action='row-save']",
			"[data-action='option-toolbar-save']",
			"[data-action='itemsrelated-toolbar-save']",
			"[data-action='itemsanalog-toolbar-save']",
		];
		
		if (rowEditForm) {
			
			var btn;
			
			for(var i = 0; i < listBtns.length; i++) {
				
				btn = rowEditForm.querySelector(listBtns[i]);
				//console.log(btn);
				if (btn) {
					
					btn.click();
				}
				
			}
			 
		}

	}
	
	exportXMLModify(o) {
		
		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"exportXMLModify",
			}
		};
		
		tools.work(1, o);
		ajax.start(args, o).then(
		
			function(d) {
				
				d = ajax.end(d, o); tools.work(0, o);
				
				if (d["info"]["success"]) {//успішно
					
					vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
					
				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);
	}
	
	exportDataSetOption (o, optionID) {

		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"exportDataSetOption",
			},
			optionID	:	optionID
		};
		
		ajax.start(args, o).then(
		
			function(d) {
				
				d = ajax.end(d, o);
				
				if (d["info"]["success"]) {//успішно
					
					vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
					
				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);
	}
	
	formedLinkToXML(o) {
		
		let name = o.closest("form").querySelector("[name='name']").value;
		
		if (name) {
			o.removeAttribute("onclick");
			let href = o.getAttribute("href") + name;
			o.setAttribute("href", href);
			o.click();
		}

	}

	exportTaxonomy(o) {
		
		let owner = o.getAttribute("data-owner");
		let link = o.getAttribute("data-link");
		
		if (owner && link) {
			
			var args = {
				h	:	"exec",
				a	:	{
					work	:	1,
					name	:	"exportTaxonomy",
				},
				p	:	{
					owner	:	owner,
					link	:	link,
				}

			};
			
			ajax.start(args, o).then(
			
				function(d) {
					
					d = ajax.end(d, o);
					
					if (d["info"]["success"]) {//успішно
						
						vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);				
		}

	}
	
	addTargetsFromAddData(searchValue, field, row, config, addData) {

		let html = searchValue;
		//console.log(html);
		let language;
		let a;
		let link;
		let links = "";
		let linksL = "";
		let list = config["addon"]["args"];
		let success = 0;

		let typeReplaceList = {
			"2"	:	"novosti",
			"3"	:	"stati"
		};
		
		if (addData?.["urlTranslate"]) {

			for (let i = 0; i < addData["urlTranslate"]["lOrder"].length; i++) {
				
				language = addData["urlTranslate"]["lOrder"][i];

				linksL = "";

				if (language == 1) {//тільки укр
					
					for (let j = 0; j < list.length; j++) {

						if (addData?.["urlTranslate"]?.["url"]?.[searchValue]?.[language] != undefined && list[j][3] && row["target"].indexOf(list[j][0]) !== -1) {//active

							link = list[j][1];
							
							if (addData["urlTranslate"]["languages"][language]["url"]) {
								link += "/";
							}
							
							link += addData["urlTranslate"]["languages"][language]["url"];
							

							if (typeReplaceList?.[row["type"]]) {
								link += "/blog/" + typeReplaceList[row["type"]];
							}
							
							if (addData["urlTranslate"]["url"][searchValue][language]) {
								link += "/" + addData["urlTranslate"]["url"][searchValue][language];
							}
							
							a = "<a href='"+link+"' target='_blank'>"+list[j][2]+"</a>";
							linksL += a;

						}
					}
					
				}
				
				if (linksL) {
					
					links += "<div class='toolbar'>"+linksL+"</div>";
					
				}

			}
			
		}
		
		if (links) {

			return "<div class='target'>"+links+"</div>";
			
		} else {
			
			return "";
			
		}

	}
	
	addTargetsFromAddDataToTarget(searchValue, field, row, config, addData) {

		let targets = row["target"].split(",");
		let text = "";
		let link = "";
		let links = [];
		searchValue = row["ID"];
		let listTargets = config["addon"]["args"];
		
		let typeReplaceList = {
			"2"	:	"novyny",
			"3"	:	"statti"
		};

		if (targets[0]) {//непусто

			for (let i = 0; i < targets.length; i++) {
				
				for (let j = 0; j < listTargets.length; j++) {

					if (listTargets[j][0] == targets[i]) {

						text = listTargets[j][2];
						
						if (
							listTargets[j][3]
							&& addData?.["urlTranslate"]
							&& addData?.["urlTranslate"]?.["url"]?.[searchValue]
						) {
							
							link = listTargets[j][1];

							if (typeReplaceList?.[row["type"]]) {
								link += "/blog/" + typeReplaceList[row["type"]];
							}
							link += "/"+addData["urlTranslate"]["url"][searchValue][1];
							
							text = "<a href='"+link+"' target='_blank'>"+ text + "</a>";
						}
						
						links.push(text);
					}
					
				}
			}
			
			return links.join(", ");
		} else {
			
			return "—";
			
		}

/*		if (addData?.["urlTranslate"]) {

			for (let i = 0; i < addData["urlTranslate"]["lOrder"].length; i++) {
				
				language = addData["urlTranslate"]["lOrder"][i];

				linksL = "";

				if (language == 1) {//тільки укр
					
					for (let j = 0; j < list.length; j++) {

						if (
							addData?.["urlTranslate"]?.["url"]?.[searchValue]?.[language] != undefined
							&& list[j][3] 
							&& row["target"].indexOf(list[j][0]) !== -1
						) {

							link = list[j][1];
							
							if (addData["urlTranslate"]["languages"][language]["url"]) {
								link += "/";
							}
							
							link += addData["urlTranslate"]["languages"][language]["url"];
							

							if (typeReplaceList?.[row["type"]]) {
								link += "/blog/" + typeReplaceList[row["type"]];
							}
							
							if (addData["urlTranslate"]["url"][searchValue][language]) {
								link += "/" + addData["urlTranslate"]["url"][searchValue][language];
							}
							
							a = "&nbsp;<a href='"+link+"' target='_blank'>"+list[j][2]+"</a>";
							linksL += a;

						} else {
							targetText = list[j][2];
						}
					}
					
				}				
				
				if (linksL) {
					
					links += "<div class='toolbar'>"+linksL+"</div>";
					
				}

			}
			
		}
		
		if (links) {

			return "<div class='target'>"+links+"</div>";
			
		} else {
			
			return "<span title='Не встановлено Url'>"+targetText+"</span>";
			
		}

	*/
	}

	priceManageFeatureSelect(o, isFocus) {
		
		var select = o.closest("form").querySelector("[name=feature]");
		
		if (!select) {
			select = o.closest("form").querySelector("[data-name='feature']");
		}
		
		if (select) {
			
			var options = select.querySelectorAll("option");

			if (isFocus != undefined) {
				o.removeAttribute("onfocus");
			} else {
				
				if (select.value) {
					select.value = null;
				}
			}
			
			switch (o.value) {
				
				case "":
					setAllUnVisible();
				break;
				
				case "0":
					setAllUnVisible();
				break;
				
				default:
					setVisibleType();
					
			}
			//select.value = 13;
		}

		function setVisibleType () {

			if (select && options) {

				tools.work(1, select.parentNode);

				for (let i = 0; i < options.length; i++) {
					
					if (options[i].getAttribute("data-t") == o.value) {
						options[i].classList.add("v");
					} else {
						options[i].classList.remove("v");
					}
					
				}
				
				setTimeout (function() {
					tools.work(0, select.parentNode);
				}, 100);
				
			}
			
		}
		
		function setAllUnVisible () {
					

			if (select && options) {

				tools.work(1, select.parentNode);
				
				for (let i = 0; i < options.length; i++) {
					
					options[i].classList.remove("v");
				}
				
				setTimeout (function() {
					tools.work(0, select.parentNode);
				}, 100);
			}
			
		}

	}
	
	optionGetFromAddDataForFeature(name, addData) {
		
		var res = [{
			"value"	:	"",
			"html"	:	"—",
		}];
		
		var index, oAttr;

		if (addData?.[name]) {

			for (var i = 0; i < addData[name][0].length; i++) {
				
				oAttr = {
					"value"	:	addData[name][0][i],
					"html"	:	addData[name][1][i],
				};

				index = Object.keys(addData[name][2]["addon"]).indexOf(String(addData[name][0][i]));

				if (index !== -1) {

					oAttr["attr"] = {"data-t" : Object.values(addData[name][2]["addon"])[index]};
					
				}
				
				res.push(oAttr);
				
			}
		}

		return res;
		
	}
	
	toggleDisplayNoneByPrevBlockElementValue(input, data) {
		
		if (data["data"]["optionSign"] == "1") {//показати
			
			input.closest(".block").classList.remove("displayNone");
			
		}

	}
	
	generateExportXML(o) {

		let p = {};
		
		p["name"] = o.getAttribute("data-name");
		p["ID"] = o.getAttribute("data-id");
		
		if (p?.["name"]) {
			
			var args = {
				h	:	"exec",
				a	:	{
					name	:	"generateExportXML",
				},
				p	:	p,
			};
			
			tools.work(1);
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d); tools.work(0);
					
					if (d["info"]["success"]) {//успішно
						
						vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});
						
						cell.reloadTrAfterEdit({"table":"export", "ID" : o.closest("tr").getAttribute("data-id")});//перечитали рядок в адмінці
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);
		
		} else {
		
			vNotify.error({text: library.get("Error"),visibleDuration:10000});
		
		}

	}
	
	generateExportXLSX(o) {

		let p = {};
		
		p["name"] = o.getAttribute("data-name");
		
		if (p?.["name"]) {
			
			var args = {
				h	:	"exec",
				a	:	{
					name	:	"generateExportXLSX",
				},
				p	:	p,
			};
			
			tools.work(1, o);
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d); tools.work(0, o);
					
					if (d["info"]["success"]) {//успішно
						
						vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});
						
						cell.reloadTrAfterEdit({"table":"export", "ID" : o.closest("tr").getAttribute("data-id")});//перечитали рядок в адмінці
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);
		
		} else {
		
			vNotify.error({text: library.get("Error"),visibleDuration:10000});
		
		}

	}
	
	generateExportCSV(o) {

		let p = {};
		
		p["name"] = o.getAttribute("data-name");
		
		if (p?.["name"]) {
			
			var args = {
				h	:	"exec",
				a	:	{
					work	:	1,
					name	:	"generateExportCSV",
				},
				p	:	p,
			};
			
			tools.work(1);
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d); tools.work(0);
					
					if (d["info"]["success"]) {//успішно
						
						vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});
						
						cell.reloadTrAfterEdit({"table":"export", "ID" : o.closest("tr").getAttribute("data-id")});//перечитали рядок в адмінці
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);
		
		} else {
		
			vNotify.error({text: library.get("Error"),visibleDuration:10000});
		
		}

	}

	generateExportJSON(o) {

		let p = {};
		
		p["name"] = o.getAttribute("data-name");
		p["ID"] = o.getAttribute("data-id");
		
		if (p?.["name"]) {
			
			var args = {
				h	:	"exec",
				a	:	{
					name	:	"generateExportJSON",
				},
				p	:	p,
			};
			
			tools.work(1);
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d); tools.work(0);
					
					if (d["info"]["success"]) {//успішно
						
						vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});
						
						cell.reloadTrAfterEdit({"table":"export", "ID" : o.closest("tr").getAttribute("data-id")});//перечитали рядок в адмінці
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);
		
		} else {
		
			vNotify.error({text: library.get("Error"),visibleDuration:10000});
		
		}

	}
		

	multipleOperation (o) {
		
		let action = o.value;
		let IDs = o.closest(".toolbar").querySelector("[data-id='eListID'] input").value;
		let reloadButton = o.closest(".line").querySelector("[data-action='table-reload']");
		
		if (action && IDs) {
			
			switch (action) {
				
				case "setArticlePage":
				
					let confirmed = confirm(library.get("Are you sure?"));

					if (confirmed) {
						
						var args = {
							h	:	"exec",
							a	:	{
								work	:	1,
								name	:	"setArticlePage",
							},
							p	:	IDs

						};
						
						ajax.start(args).then(
						
							function(d) {
								
								d = ajax.end(d);
								
								if (d["info"]["success"]) {//успішно
									
									o.value = "";
									reloadButton.click();
									
								}
							}
							
						);
						
					}
					
				break;
			}
			
		}
		
	}

	addDomainToEmail(o) {
		
		var select = o.closest("form").querySelector("[name='domain_id']");
		var domain = select.options[select.selectedIndex].text;
		
		if (domain) {
			var input = o.closest("form").querySelector("[name='email']");
			input.value += "@" + domain;
		}
		
	}
	
	selectBrandLineOptionByBrand(o, isBrandLine) {
		
		let brandSelect;
		let brandLineSelect;
		
		if (isBrandLine) {
			brandSelect = o.closest("form").querySelector("[name='brand']");
			brandLineSelect = o;
		} else {
			brandSelect = o;
			brandLineSelect = o.closest("form").querySelector("[name='brandLine']");
			
		}
		
		/*завжди очищаємо brandLineSelect*/
		
		let brandLineSelectOption = brandLineSelect.querySelectorAll("option");
		
		for (let i = 0; i < brandLineSelectOption.length; i++) {
			
			if (brandLineSelectOption[i].value) {
				
				brandLineSelectOption[i].remove();
				
			}
		
		}
		/*\завжди очищаємо brandLineSelect*/
		
		let brandID = parseInt(brandSelect.value);
		if (brandID > 0) {
			
			/*отримуємо список brandLine*/
			
			let block = brandSelect.closest(".block");
			var args = {
				h	:	"exec",
				a	:	{
					work	:	1,
					name	:	"selectBrandLineOptionByBrand",
				},
				brandID	:	brandID,
			};

			ajax.start(args, block).then(
			
				function(d) {
					
					d = ajax.end(d, block);
					
					if (d["info"]["success"]) {//успішно
						
						element.optionSet (brandLineSelect, d["data"]);
						brandLineSelect.focus();
						
					} else {
						
						return false;
						
					}
				}
				
			);

			/*\отримуємо список brandLine*/

		}

	}

	categoryByPropertyToolbar(config, block) {

		while (block.firstChild) {//видаляємо всі дочірні елементи
			
			block.removeChild(block.firstChild);
			
		}
		
		let ID = parseInt(config["ID"]);
		let table = config["table"];
		
		if (!isNaN(ID)) {//при редагуванні
			
			var args = {
				h	:	"exec",
				a	:	{
					"name"	:		"getCategoryByPropertyToolbarData",
					"work"		:	1,
				},
				p	:	{
					"table"		:	table,
					"parent"	:	ID,
				},
			};
			
			ajax.start(args).then(
			
				function(d) {
					
					d = ajax.end(d);
					
					if (d["info"]["success"]) {

						var line = element.create("div", {
							"class"	:	"line",
						});
						
						var toolbarLeft = element.create("div", {
							"class"	:	"toolbar",
						});
						
						var reloadButton = element.create("button", {
							
							"class"	:	["la", "la-24", "la-refresh", "h-40"],
							"attr"	:	{
								"type":			"button",
								"title":		library.get("Reload") + " " + library.get("CategoryByProperty"),
								"data-action":	"categoryByProperty-toolbar-reload",
							}
							
						});
						
						var callbackF = function(p1, p2) {
							
							return function() {
								
								shopTools.categoryByPropertyToolbar(p1, p2);
								
							};
							
						};
						
						reloadButton.addEventListener("click", callbackF(config, block));
						toolbarLeft.append(reloadButton);

						var groupsForm = element.create("div", {
							"class"	:	"groups",
							"attr"	:	{
								"data-type"		:	"form",
								"data-checkbox"	:	"checkedOnly",
							}
						});
						
						groupsForm.append(line);
						
						groupsForm.append(element.create("input", {"attr":{"type":"hidden","data-name":"table"},"value":table}));
						groupsForm.append(element.create("input", {"attr":{"type":"hidden","data-name":"parent"},"value":ID}));

						if (d?.["permission"] && d["permission"] == "1111") {//повинні бути права на все
							
							var saveButton = element.create("button", {
								
								"class"	:	["la", "la-24", "la-save", "h-40"],
								"attr"	:	{
									"type":			"button",
									"title":		library.get("Save") + " " + library.get("Options"),
									"data-action":	"property-toolbar-save",
									"onclick"	:	"runTools.saveCategoryByPropertyToolbarDataBtn(this)"
								}
								
							});
							
							toolbarLeft.append(saveButton);
							
						}
						
						toolbarLeft.append(element.create("div", {
							"class"	:	["bg-pink", "disabled", "h-40"], 
							"html"	:	library.get("Categories"),
							"attr"	:	{
								"data-action"	:	"info",
							}
						}));
						
						if (d["count"] == undefined) {
							d["count"] = 0;
						}
						
						var count = d["count"];
						
						toolbarLeft.append(element.create("div",{
							
							"class"	:	"count",
							"html"	:	count
							
						}));
						
						line.prepend(toolbarLeft);
						
						block.append(groupsForm);
						
						var treeElem = element.create("div",{
							
							"html"	:	d["tree"],
							"attr"	:	{
								"style"	:	"margin:10px 0;max-height:max-content;background-color:#f8f8f8;padding:10px 10px 0",
							},
							
						});
						
						groupsForm.append(treeElem);
						
						//groupsForm.append(line.cloneNode(true));
						
						trees.view(treeElem);
						trees.checkData(treeElem, d["data"], ID);
						trees.setAll(treeElem);
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
			
			);
			
		}
	}

	formedProductName(o) {
		let ID;
		if (o == undefined) {//всі
			ID = 0;
		} else {
			ID = o.closest("tr").getAttribute("data-id");
		}
		
		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"formedProductName",
			},
			ID	:	ID

		};

		ajax.start(args, o).then(
		
			function(d) {
				
				d = ajax.end(d, o);
				
				if (d["info"]["success"]) {//успішно
					
					vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});
					
				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);	
	}
	
	stopPhraseChecker(o) {

		let ID = o.closest("tr").getAttribute("data-id");
		if (!ID) {
			return;
		}
		
		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"stopPhraseChecker",
			},
			ID	:	ID

		};
		
		tools.work(1, o);
		
		ajax.start(args, o).then(
		
			function(d) {
				
				d = ajax.end(d, o); tools.work(0, o);
				
				if (d["info"]["success"]) {//успішно
					
					vNotify.info({
							text			:	d["info"]["text"],
							visibleDuration	:	60000,
							position		:	"center",
					});
					
				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);	
	}
	
	processMaudauCSV(o) {
		
		let fileID = o.closest("tr").getAttribute("data-id");
		let exportID = o.closest("table").closest("tr").getAttribute("data-id");
		let btnReload = o.closest("form").querySelector("button[data-action='row-reload']");
		
		if (
			fileID
			&& exportID
			&& btnReload
		) {

			let args = {
				h	:	"exec",
				a	:	{
					work	:	1,
					name	:	"processMaudauCSV",
				},
				p	:	{
					"fileID"	:	fileID,
					"exportID"	:	exportID,
				}

			};

			ajax.start(args, o).then(
			
				function(d) {

					d = ajax.end(d, o);

					if (d["info"]["success"] == 1) {//успішно
						
						vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});

						btnReload.click();
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);	
		}
	}
	
	processMappingCols(o, fileID) {
		
		let categoryID = o.closest("table").closest("tr").getAttribute("data-id");
		let marketPlaceID = o.previousElementSibling.value;

		if (
			fileID
			&& categoryID
			&& marketPlaceID
		) {

			let args = {
				h	:	"exec",
				a	:	{
					name	:	"processMappingCols",
				},
				p	:	{
					"fileID"		:	fileID,
					"categoryID"	:	categoryID,
					"marketPlaceID"	:	marketPlaceID,
				}

			};
			
			tools.work(1, o);
			ajax.start(args, o).then(
			
				function(d) {

					d = ajax.end(d, o); tools.work(0, o);

					if (d["info"]["success"] == 1) {//успішно
						
						vNotify.info({text: d["info"]["text"], visibleDuration:2000,showClose:false});
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);	
		}
	}
	
	processMappingAttr(o, fileID) {
		
		let categoryID = o.closest("table").closest("tr").getAttribute("data-id");
		let marketPlaceID = o.previousElementSibling.value;

		if (
			fileID
			&& categoryID
			&& marketPlaceID
		) {

			let args = {
				h	:	"exec",
				a	:	{
					name	:	"processMappingAttr",
				},
				p	:	{
					"fileID"		:	fileID,
					"categoryID"	:	categoryID,
					"marketPlaceID"	:	marketPlaceID,
				}

			};
			
			tools.work(1, o);
			ajax.start(args, o).then(
			
				function(d) {

					d = ajax.end(d, o); tools.work(0, o);

					if (d["info"]["success"] == 1) {//успішно
						
						vNotify.info({text: d["info"]["text"], visibleDuration:5000,showClose:false});
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);	
		}
	}
	
	processCategoryExportMarketPlace(o, categoryID) {

		let marketPlaceID = o.previousElementSibling.value;

		if (
			categoryID
			&& marketPlaceID
		) {

			let args = {
				h	:	"exec",
				a	:	{
					name	:	"processCategoryExportMarketPlace",
				},
				p	:	{
					"categoryID"	:	categoryID,
					"marketPlaceID"	:	marketPlaceID,
				}

			};
			
			tools.work(1, o);
			ajax.start(args, o).then(
			
				function(d) {

					d = ajax.end(d, o); tools.work(0, o);

					if (d["info"]["success"] == 1) {//успішно
						
						vNotify.info({text: d["info"]["text"], visibleDuration:5000,showClose:false});
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);	
		}
	}

	getExportXlsxFileList(o, startName) {

		let args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"getExportXlsxFileList",
			},
			p	:	{
				"startName"		:	startName,
			}

		};
		
		tools.work(1);
		ajax.start(args, o).then(
		
			function(d) {

				d = ajax.end(d, o); tools.work(0);
					
				if (d["info"]["success"] == 1) {//успішно
					
					vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});
					
					let html = "";
					if (d?.["data"]) {
						
						for (let i = 0; i < d["data"].length; i++) {
							html += "<li><a href='"+d["url"]+d["data"][i]+"'>"+d["data"][i]+"</a></li>";
						}
						
						html = "<ol>"+html+"</ol>";
						tools.toModal({
							"target"	:	1,
							"header"	:	"Список файлів",
							"html"		:	html,
						});
					}
					
					

				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);	
	}
	
	deleteRowMappingOptionSet(o, ID) {
		
		if (!confirm("Впевнені, що хочете видалити цю прив'язку?")) {
			return;
		}
		
		let args = {
			h	:	"exec",
			a	:	{
				name	:	"deleteRowMappingOptionSet",
			},
			p	:	{
				"ID"	:	ID,
			}

		};

		tools.work(1);
		ajax.start(args).then(
		
			function(d) {

				d = ajax.end(d); tools.work(0);

				if (d["info"]["success"] == 1) {//успішно
					
					let btnRowReload = o.closest("tr").querySelector("button[data-action='tr-reload']");
					if (btnRowReload) {
						btnRowReload.click();
					}					
					if (d?.["info"]?.["text"]) {
						
						vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});
					}
					
				} else {
					
					if (d?.["info"]?.["text"]) {
						
						vNotify.error({
							text: d["info"]["text"],
							visibleDuration:10000,
							position: "center",
						});

					}
				}
			}
		);
		
	}

	addRowMappingOptionSet(o, optionSet, marketPlace) {
		
		let value = o.previousElementSibling.value;

		if (
			!value
			|| value == "0"
		) {
			vNotify.error({
				text: "Не схоже на ID",
				visibleDuration:10000,
				position: "center",
			});
			return;
		}
		
		let args = {
			h	:	"exec",
			a	:	{
				name	:	"addRowMappingOptionSet",
			},
			p	:	{
				"optionSet"		:	optionSet,
				"marketPlace"	:	marketPlace,
				"mappingCols"	:	value,
			}

		};

		tools.work(1);
		ajax.start(args).then(
		
			function(d) {

				d = ajax.end(d); tools.work(0);

				if (d["info"]["success"] == 1) {//успішно
					
					let btnRowReload = o.closest("tr").querySelector("button[data-action='tr-reload']");
					if (btnRowReload) {
						btnRowReload.click();
					}
					
					if (d?.["info"]?.["text"]) {
						
						vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});
					}
					
				} else {
					
					if (d?.["info"]?.["text"]) {
						
						vNotify.error({
							text: d["info"]["text"],
							visibleDuration:10000,
							position: "center",
						});

					}
				}
			}
		);

	}

	getMappingOptionList(o, marketPlace, optionSet, attributeID, attributeCode) {
		
		let args = {
			h	:	"exec",
			a	:	{
				name	:	"getMappingOptionList",
			},
			p	:	{
				"optionSet"		:	optionSet,
				"marketPlace"	:	marketPlace,
				"attributeID"	:	attributeID,
				"attributeCode"	:	attributeCode,
			}

		};

		tools.work(1);
		ajax.start(args).then(
		
			function(d) {

				d = ajax.end(d); tools.work(0);

				if (
					d["info"]["success"] == 1
				) {//успішно
					
					let htmlOptionList = shopTools.renderHtmlOptionList(d["data"]["optionList"]);
					let htmlAttributeOption = shopTools.renderHtmlAttributeOption(d["data"]["attributeOption"]);
					
					let html = "";
					/*html += "<button title='Додати' type='button' onclick='shopTools.a(this)'>+</button>";*/
					html += "<div>";
						html += "<div>"+htmlOptionList+"<div>";
						html += "<div>"+htmlAttributeOption+"<div>";
					html += "</div>";
					
					let p = {
						"header"	: "Співставлення опцій: Наші / Епіцентр",
						"html"		: html,
					};
					
					tools.toModal(p);

				} else {
					
					if (d?.["info"]?.["text"]) {
						
						vNotify.error({
							text: d["info"]["text"],
							visibleDuration:10000,
							position: "center",
						});

					}
				}
			}
		);

	}

	renderHtmlOptionList(data) {
		let r = "";
		for (let i = 0; i < data.length; i++) {
			r += "<option>"+data[i]["name"]+"( "+data[i]["ID"]+")</option>";
		}
		if (r) {
			r = "<select>"+r+"</select>";
		}
		return r;
	}

	renderHtmlAttributeOption(data) {
		let r = "";
		for (let i = 0; i < data.length; i++) {
			r += "<option>"+data[i]["name"]+"( "+data[i]["ID"]+")</option>";
		}
		if (r) {
			r = "<select>"+r+"</select>";
		}
		return r;
	}

}

class Trees {

	/*https://www.gocher.me/treeview*/

	view(div) {
		
		let treeList;
		
		if (div == undefined) {
			
			treeList = document.querySelectorAll("ul.tree");
			
		} else {
			
			treeList = div.querySelectorAll("ul.tree");
		}
		
		if (treeList && treeList.length > 0) {
			trees.inits(treeList);
		}
	}
	
	inits(treeList) {
		for (let i=0; i<treeList.length; i++) {
			trees.init(treeList[i]);
		}
	}

	init(tree, ebenen) {

		if (!ebenen) {
			ebenen = [];
		};
		
		var liNodes = tree.children;
		var insertedElement, newElement;
		
		for (var i=0, len=liNodes.length; i < len; i++) {
			
			var el = document.createElement("span");
			if (liNodes[i].getElementsByTagName('ul').length > 0) {//є потомки
				
				newElement = element.create("input", {
					"attr"	:	{"type" : "checkbox", "onclick":"trees.set(this)"},
					"class"		:	"set",
					"checked"	:	false,
				});
				
				insertedElement = liNodes[i].insertBefore(newElement, liNodes[i].querySelector("input[type='checkbox']"));
				
				el.className = (i==liNodes.length-1) ? "lastPlus" : "nextPlus";
				el.addEventListener('click', trees.toggle);
				ebenen.push((i==liNodes.length-1) ? 'blank' : 'cont');
				trees.init(liNodes[i].getElementsByTagName('ul')[0], ebenen);
				ebenen.pop();
				
			} else {
				
				el.className = (i==liNodes.length-1) ? "last" : "next";
			};
			
			liNodes[i].insertBefore(el, liNodes[i].firstChild);
			for (var a=ebenen.length-1; a>=0; a--) {
				var el = document.createElement("span");
				el.className = ebenen[a];
				liNodes[i].insertBefore(el, liNodes[i].firstChild);
			}
		}
	}
		
	checkData(div, data, parent) {
		
		var treeList = div.querySelector("ul.tree");

		if (data && treeList) {
			
			let checkbox;
			for (let i = 0; i < data.length; i++) {
				
				checkbox = document.getElementById("cat-"+data[i]+"-"+parent);
				if (checkbox) {
					checkbox.checked = true;
				}
				
			}
		}
	}
	
	toggle(event) {
		
		var el = this;
		if (el.className == 'nextPlus') {
			el.className = 'nextMinus';
		} else if (el.className == 'nextMinus') {
			el.className = 'nextPlus';
		} else if (el.className == 'lastPlus') {
			el.className = 'lastMinus';
		} else if (el.className == 'lastMinus') {
			el.className = 'lastPlus';
		};
		
		var branch = el.parentNode.getElementsByTagName('ul')[0];
		branch.className = (branch.className == '') ? 'visible' : '';
		event.stopPropagation();
	}
	
	toggleAll(o) {
		
		let tree = o.closest("label").nextElementSibling;
		if (tree) {
			
			let uls = tree.querySelectorAll("ul");
			if (uls) {

				let status = parseInt(o.getAttribute("data-status"));
				let setClass = "visible";
				
				switch (status) {
					
					case 0:
						status = 1;
						for (let i = 0; i < uls.length; i++) {
							uls[i].classList.add("visible");
						}
					break;
					case 1:
						status = 0;
						for (let i = 0; i < uls.length; i++) {
							uls[i].classList.remove("visible");
						}
					break;
				}
				o.setAttribute("data-status", status);
			}
		
		}
	}
	
	open(o) {
		
		let tree = o.nextElementSibling;
		if (tree) {
			let uls = tree.querySelectorAll("ul");
			if (uls) {
				for (let i = 0; i < uls.length; i++) {
					uls[i].classList.add("visible");
				}
			}
			
		}
		
	}
	
	close(o) {
		
		let tree = o.previousElementSibling;
		if (tree) {
			let uls = tree.querySelectorAll("ul");
			if (uls) {
				for (let i = 0; i < uls.length; i++) {
					uls[i].classList.remove("visible");
				}
			}
			
		}
		
	}
	
	set(o) {
		
		let state = o.checked;//стан після кліка
		let childsUl = o.closest("li").querySelector("ul");
		
		if (childsUl) {//є потомки
			
			let childs = childsUl.querySelectorAll("li input[type='checkbox']");
			let setCheckbox = o.nextElementSibling;
			
			setCheckbox.checked = state;

			if (childs) {
				
				for (let i = 0; i < childs.length; i++) {
					
					childs[i].checked = state;
					
				}
			}
			let div = o.closest("div");
			if (div) {
				trees.setAll(div);
			}			
		}
	}
	
	verify(o) {
		
		let div = o.closest("div");
		if (div) {
			trees.setAll(div);
		}
		/*let liTop = o.closest("ul.tree>li");

		if (liTop) {//знайшли самий верхній li
			
			let childs = liTop.querySelectorAll("input[type='checkbox'][name]");
			let mainCheckbox;
			
			for (const child of liTop.children) {

				if (child.tagName == "INPUT" && !child.getAttribute("name")) {
					mainCheckbox = child;
					break;
				}
			}

			if (mainCheckbox && childs) {
				
				let childsCount = childs.length;
				for (let i = 0; i < childs.length; i++) {
					
					if (childs[i].checked) {
						childsCount -= 1;
					}
					
				}
				
				if (childsCount == 0) {//всі чекані

					mainCheckbox.checked = true;
					mainCheckbox.classList.remove("part");
					
				} else {
					
					if (childsCount == childs.length) {//всі нечекані

						mainCheckbox.checked = false;
						mainCheckbox.classList.remove("part");
						
					} else {//часткого чекані
						
						mainCheckbox.classList.add("part");
						mainCheckbox.checked = true;
					}
				}
				
				//console.log(childsCount);
			}
		}
		*/
	}
	
	setAll(div) {
		
		var treeList = div.querySelector("ul.tree");
		if (treeList) {
			
			let setCheckboxs = treeList.querySelectorAll("input.set");
			if (setCheckboxs) {
				
				let dataCheckboxs;
				let dataCheckboxsChecked;
				
				for (let i = 0; i < setCheckboxs.length; i++) {
					
					dataCheckboxs = setCheckboxs[i].closest("li").querySelectorAll("ul input[type='checkbox'][data-name]");
					dataCheckboxsChecked = setCheckboxs[i].closest("li").querySelectorAll("ul input[type='checkbox'][data-name]:checked");

					if (dataCheckboxs.length == dataCheckboxsChecked.length) {
						
						setCheckboxs[i].checked = true;
						setCheckboxs[i].classList.remove("part");
						
					} else {
						
						if (dataCheckboxsChecked.length == 0) {
							
							setCheckboxs[i].checked = false;
							setCheckboxs[i].classList.remove("part");
							
						} else {
							
							setCheckboxs[i].checked = true;
							setCheckboxs[i].classList.add("part");
							
						}
					}
				}
			}
		}
	}
}

class SyncSite {

	toTargets(name, ID) {
		
		let r = null;
		
		let targets = [/*1, */2, 3];//активні вітрини
		
		if (targets) {
			
			for (let i = 0; i < targets.length; i++) {
				
				r += syncSite.go(name, targets[i], ID);
				
			}
			
		}
		
		return r;
		
	}
	
	page() {
		return syncSite.toTargets("syncSitePage");/*ok*/
	}
	
	blog() {
		return syncSite.toTargets("syncSiteBlog");/*ok*/
	}
	
	banner() {
		return syncSite.toTargets("syncSiteBanner");/*ok*/
	}
		
	brand() {
		return syncSite.toTargets("syncSiteBrand");/*ok*/
	}
	
	category() {
		return syncSite.toTargets("syncSiteCategory");/*ok*/
	}

	product() {
		return syncSite.toTargets("syncSiteProduct");/*ok*/
	}
	
	productOne(o) {
		var ID = o.closest("tr").getAttribute("data-id");
		//return syncSite.toTargets("syncSiteProductOne", ID);/*ok*/
		return syncSite.toTargets("syncSiteProduct", ID);/*ok*/
	}

	price() {
		return syncSite.toTargets("syncSitePrice");
	}
		
	related() {
		return syncSite.toTargets("syncSiteRelated");
	}
		
	go(name, target, ID) {
		
		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	name,
			},
			p	:	target,
			ID	:	ID

		};

		ajax.start(args, o).then(
		
			function(d) {
				
				d = ajax.end(d, o);
				
				if (d["info"]["success"]) {//успішно
					
					vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});
					
				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);	
	}
	
}

class UpdateTarget {
	
	toTargets(name) {
		
		let r = null;
		
		let targets = [/*1,*/ 2, 3];//активні вітрини
		
		if (targets) {
			
			for (let i = 0; i < targets.length; i++) {
				
				r += updateTarget.go(name, targets[i]);
				
			}
			
		}
		
		return r;
		
	}
	
	go(name, target) {
		
		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	name,
			},
			p	:	target,

		};

		ajax.start(args, o).then(
		
			function(d) {
				
				d = ajax.end(d, o);
				
				if (d["info"]["success"]) {//успішно
					
					vNotify.info({text: d["info"]["text"],visibleDuration:2000,showClose:false});
					
				} else {
					
					vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					
				}
			}
			
		);	
	}
		
	optionSEO() {
		return updateTarget.toTargets("updateTargetOptionSEO");
	}
	
		
	redirect() {
		return updateTarget.toTargets("updateTargetRedirect");
	}
	
}

/*Factory Registered classes*/

Factory.register("ShopTools", ShopTools); shopTools = Factory.create("ShopTools");
Factory.register("SyncSite", SyncSite); syncSite = Factory.create("SyncSite");
Factory.register("Trees", Trees); trees = Factory.create("Trees");
Factory.register("UpdateTarget", UpdateTarget); updateTarget = Factory.create("UpdateTarget");

/*\Factory Registered classes*/

edToolbar.rowToolbarCurrent = function () {
	var setting = [

		{
			"class"		:	["lab", "la-html5"],
			"onclick"	:	"runTools.setTextareasPreview(this);",
			"title"		:	library.get("Preview"),
		},

	];
	
	var toolbar = element.create("div", {"class" : "toolbar"});
	edToolbar["createButtons"](toolbar, setting);
	
	return toolbar;
};

runTools.editorPellStart = function (textarea, divPell) {
	
	textarea.classList.add("displayNone");//ховаємо textarea
	
	/*divPell.addEventListener("click", function(e) {
		if (e.target.getAttribute("contenteditable")) {
			runTools.toggleTextareaPell(textarea);
		}
	});*/
}

runTools.categoryByPropertyToolbar = function (p, block) {//не працює ні через підміну метода, ні як самостійний метод
	
		console.log(p, block);

}

runTools.saveCategoryByPropertyToolbarDataBtn = function(o) {
	
	var formO = o.closest("[data-type='form']");
	runTools.saveCategoryByPropertyToolbarData(form.returnData(formO), formO);
}

runTools.saveCategoryByPropertyToolbarData = function(data, formO) {
	
	var args = {
		h	:	"exec",
		a	:	{
			work	:	1,
			name	:	"saveCategoryByPropertyToolbarData",
		},
		data	:	data,
	};
	
	ajax.start(args, formO).then(
	
		function(d) {
			
			d = ajax.end(d, formO);
			
			if(d["info"]["success"]) {//успішно
				
				vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
				
			} else {
				
				vNotify.error({text: d["info"]["text"],visibleDuration:10000});
				
			}
		}
		
	);
}

row.itemCopy = function (o) {
	
	var ID = o.closest("tr").getAttribute("data-id");
	
	var args = {
		h	:	"exec",
		a	:	{
			work	:	1,
			name	:	"itemCopy",
		},
		ID	:	ID

	};
	
	ajax.start(args, o).then(
	
		function(d) {
			
			d = ajax.end(d, o);
			
			if (d["info"]["success"]) {//успішно
				
				vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
				
				var tableItemHead = o.closest("table").querySelector("thead");
				
				var tableItemTR = element.create("tr", {"attr" : {"data-id" : ID}});
				
				var tds = o.closest("tr").querySelectorAll("td");
				
				if (tds && tds.length) {
					
					for (var i = 0; i <tds.length; i++) {
						
						tableItemTR.append(element.create("td"));
						
					}
					
				}
				
				tableItemHead.prepend(tableItemTR);
				
				var dataHref = "/p/run/";
				
				var argsBtn = {
					h	:	"row",
					a	:	{
						work	:	1,
						name	:	"article",
						config	:	"article-item",
						//action	:	"view",
						action	:	"edit",
						t		:	{
							/*"someTr"	:	"Table::trReload"*/
							"innerTr"	:	"Row::formEdit"
						},
						ID	:	d["data"]
					},
				};
				
				var reloadTRBtn = element.create("button", {
					"attr"	:	{
						"type"		:	"button",
						"onclick"	:	"run.go(this)",
						"data-href"	:	dataHref + tools.transformObjToStr(argsBtn)
					},
					"html"	:	"122"
				
				});
				
				tableItemTR.append(reloadTRBtn);
				reloadTRBtn.click();

			} else {
				
				vNotify.error({text: d["info"]["text"],visibleDuration:10000});
				
			}
		}
		
	);
	
}

valid.barCode = function(p) {
	
	return true;
	if (p["value"] == "") { return true; }
	
	//перевіряємо на унікальність, якщо не пусто, синхронним запитом
	let o = p["el"].closest(".block");
	var args = {
		h	:	"exec",
		a	:	{
			work	:	1,
			name	:	"priceValidBarCode",
		},
		p	:	{
			value	:	p["value"],
			ID		:	p["params"],
		}
	};
	
	var d = ajax.sync(args, o);
	
	if (d === null) {
		return false;
	}

	if (d["info"]["success"]) {
		return true;
	} else {
		return false;
	}
}

valid.iHerbCode = function (p) {
	return true;
	if (p["value"] == "") { return true; }
	
	//перевіряємо на унікальність, якщо не пусто, синхронним запитом
	let o = p["el"].closest(".block");
	var args = {
		h	:	"exec",
		a	:	{
			work	:	1,
			name	:	"priceValidIHerbCode",
		},
		p	:	{
			value	:	p["value"],
			ID		:	p["params"],
		}
	};
	
	var d = ajax.sync(args, o);
	
	if (d === null) {
		return false;
	}
	if (d["info"]["success"]) {
		return true;
	} else {
		return false;
	}
}

runTools.htmlEntityDecode = function(o) {
	
	let elemRu = o.closest("div.block").querySelector("textarea[name='fakeField-translate-7-2']");
	
	if (elemRu) {
		
		let htmlRu = elemRu.value;

		if (htmlRu) {
			
			let args = {
				h	:	"exec",
				a	:	{
					"name"		:	"htmlEntityDecode",//method
					"work"		:	1
				},
				html	:	htmlRu,
			};
			
			ajax.start(args, o).then(
				function(d){
					d = ajax.end(d, o);
					
					if (d["info"]["success"]) {
						
						elemRu.value = d["data"]["html"];
					} else {
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
					}
				}
			);
		}
	}


}

exec.showProductWithoutPriceProperty = function(args, o, d) {
	
	if (d == undefined) {//підправимо аргументи на старті

		args["a"]["work"] = 1;
		return args;
		
	} else {
		
		let eHeaderAfter = document.querySelector("[data-id='eHeaderAfter']");
		let eArticle = document.getElementById("content").querySelector("[data-id='eArticle']");
		let html = "";
		
		eHeaderAfterHtml = "Товари з варіантами без характеристик";

		if (d["info"]["success"]) {
			
			if (!d?.["count"]) {
				d["count"] = 0;
			}
			
			eHeaderAfterHtml += " ["+d["count"]+"]";

			let trH = "<tr><th>##</th><th>ID</th><th>extID</th><th>name</th><th>count</th></tr>";
			let i, j;
			
			if (d?.["data"]) {
				for (i = 0; i < d["data"].length; i++) {
					html += "<tr>";
					
					html += "<td>"+(i+1)+"</td>";
					html += "<td>"+d["data"][i]["ID"]+"</td>";
					html += "<td>"+d["data"][i]["extID"]+"</td>";

					html += "<td>";
					/*html += "<a href='/p/run/h=table&a%5Bname%5D=article&a%5Bconfig%5D=article-item&a%5Bfilter%5D%5BID%5D=%3D%7C"+d["data"][i]["ID"]+"' onclick='run.go(this);return false'>";
					html += d["data"][i]["name"]+"</a><br>";*/
					html += "<a href='/p/run/h=table&a%5Bname%5D=article&a%5Bconfig%5D=article-item&a%5Bfilter%5D%5BID%5D=%3D%7C"+d["data"][i]["ID"]+"' target='_blank'>";
					html += d["data"][i]["name"]+"</a>";
					
					if (d?.["data"]?.[i]?.["sa"]) {
						
						html += "<ol>";
						for (j = 0; j < d["data"][i]["sa"].length; j++) {
							
							html += "<li>";
							html += d["data"][i]["sa"][j]["code"]+" / "+d["data"][i]["sa"][j]["name"];
							html += "</li>";
						}
						html += "</ol>";
					}
					
					html += "</td>";
					
					html += "<td>"+d["data"][i]["count"]+"</td>";
					
					html += "</tr>";
				}
			
			}
			
			if (html) {

				html = "<div class='table-wr'><table><tbody>"+trH+html+"</tbody></table></div>";
			}
			
			
		} else {
			
			vNotify.error({text: d["info"]["text"],visibleDuration:10000});
			
		}
		
		eHeaderAfter.innerHTML = "<h1>"+eHeaderAfterHtml+"</h1>";
		eArticle.innerHTML = html;
	}
}

tableModify.fromAddDataToSEO = function(text, field, row, config, addData) {
	
	if (addData?.["targetList"]) {
		
		let targetList = addData["targetList"];
		let i;
		let a;
		let r = [];
		
		for (i = 0; i < targetList[1].length; i++) {
			
			if (targetList[1][i][3]) {
				
				a = "<a href='"+targetList[1][i][1]+"/"+row["url"]+"' target='_blank'>"+targetList[1][i][2]+"</a>";
				r.push(a);
			}
		}

		if (r) {
			text = r.join(", ");
		}

	}

	return text;
}

tableModify.exportNameWrapLink = function(text, field, row) {
	
	let h = "";
	
	switch (row["type"]) {
		
		case "xml":

			h += "<div class='toolbar if'>";

				h += "<a title='Відкрити в новій вкладці згенерований на льоту' target='_blank' class='btn las la-16 la-external-link-alt h-30' href='/p/xml/"+text+"'></a>";

				h += "<a title='Згенерувати за зберегти (+zip, якщо встановлено Zipped)' onclick='shopTools.generateExportXML(this);return false' class='btn las la-16 la-fire h-30' data-name='"+text+"' data-id='"+row["ID"]+"' style='color:blue'></a>";
				
				h += "<a title='Відкрити в новій вкладці згенерований(якщо є)' target='_blank' class='btn las la-16 la-external-link-alt h-30' href='/p/xml/"+text+".xml' style='color:blue'></a>";

				if (row["zipped"] == 1) {
					h += "<a title='Завантажити згенерований zip(якщо є)' class='btn las la-16 la-download h-30' href='/p/xml/"+text+".xml.zip' style='color:orange'></a>";
				}
				
			h += "</div>";
			
			text += "&nbsp;"+h;
			
		break;
		
		case "xlsx":


			h += "<div class='toolbar if'>";

				h += "<a title='Згенерувати за зберегти (+zip, якщо встановлено Zipped)' onclick='shopTools.generateExportXLSX(this);return false' class='btn las la-16 la-fire h-30' data-name='"+text+"' data-id='"+row["ID"]+"' style='color:blue'></a>";

				h += "<button type='button' title='Отримати список посилань для завантаження' class='btn las la-16 la-download h-30' style='color:blue' onclick='shopTools.getExportXlsxFileList(this,\""+text+"\")'></button>";
				
				/*if (row["zipped"] == 1) {
					h += "<a title='Завантажити згенерований zip(якщо є)' class='btn las la-16 la-download h-30' href='/p/xlsx/"+text+".xlsx.zip' style='color:orange'></a>";
				}*/
				
			h += "</div>";
			
			text += "&nbsp;"+h;
			
		break;
		
		case "csv":


			h += "<div class='toolbar if'>";

				h += "<a title='Згенерувати за зберегти (+zip, якщо встановлено Zipped)' onclick='shopTools.generateExportCSV(this);return false' class='btn las la-16 la-fire h-30' data-name='"+text+"' data-id='"+row["ID"]+"' style='color:blue'></a>";
				
				h += "<a title='Завантажити згенерований csv(якщо є)' class='btn las la-16 la-download h-30' href='/p/csv/"+text+".csv' style='color:blue'></a>";
				
				if (row["zipped"] == 1) {
					h += "<a title='Завантажити згенерований zip(якщо є)' class='btn las la-16 la-download h-30' href='/p/csv/"+text+".csv.zip' style='color:orange'></a>";
				}
			h += "</div>";
			
			text += "&nbsp;"+h;
			
		break;

		case "json":

			h += "<div class='toolbar if'>";

				h += "<a title='Відкрити в новій вкладці згенерований на льоту' target='_blank' class='btn las la-16 la-external-link-alt h-30' href='/p/json/"+text+"'></a>";

				h += "<a title='Згенерувати за зберегти (+zip, якщо встановлено Zipped)' onclick='shopTools.generateExportJSON(this);return false' class='btn las la-16 la-fire h-30' data-name='"+text+"' data-id='"+row["ID"]+"' style='color:blue'></a>";
				
				h += "<a title='Відкрити в новій вкладці згенерований(якщо є)' target='_blank' class='btn las la-16 la-external-link-alt h-30' href='/p/json/"+text+".json' style='color:blue'></a>";

				if (row["zipped"] == 1) {
					h += "<a title='Завантажити згенерований zip(якщо є)' class='btn las la-16 la-download h-30' href='/p/json/"+text+".json.zip' style='color:orange'></a>";
				}
				
			h += "</div>";
			
			text += "&nbsp;"+h;
			
		break;
	}

	return text;
}

tableModify.fromAddDataPriceProperty = function(text, field, row, config, addData) {
	
	if (
		addData?.["listPriceProperty"]
		&& addData?.["listPriceProperty"]?.[row["ID"]]
	) {
		text = "<span class='small' style='color:#000'>"+addData["listPriceProperty"][row["ID"]]+"</span>";
	}

	return text;
}

tableModify.fromAddDataListBarCodeCount = function(text, field, row, config, addData) {
	
	if (
		addData?.["listBarCodeCount"]
		&& addData?.["listBarCodeCount"]?.[row["ID"]]
	) {
		text = "<span class='small' style='color:#000'>"+addData["listBarCodeCount"][row["ID"]]+"</span>";
	}

	return text;
}

tableModify.modifyFileCategoryProcessMapping = function(text, field, row, config, addData) {

	/*виводимо відповідну кнопку*/

	if (row["name"].startsWith('export-attribute-set')) {
		text = "<div class='toolbar'>"+config["modifyFileCategoryProcessMapping"]+"<button title='Обробити цей XLS-файл атрибутів' class='las la-24 la-sign-out-alt h-40' type='button' onclick='shopTools.processMappingAttr(this, "+row["ID"]+")'></button></div>";
	} else {
		text = "<div class='toolbar'>"+config["modifyFileCategoryProcessMapping"]+"<button title='Обробити цей XLS-файл колонок' class='las la-24 la-sign-in-alt h-40' type='button' onclick='shopTools.processMappingCols(this, "+row["ID"]+")'></button></div>";
	}
	
	return text;
}

tableModify.modifyCategoryExportMarketPlace = function(text, field, row, config, addData) {

	/*виводимо відповідну кнопку*/

	text = "<div class='toolbar'>"+config["modifyCategoryExportMarketPlace"]+"<button title='Обробити цей XLS-файл атрибутів' class='las la-24 la-sign-out-alt h-40' type='button' onclick='shopTools.processCategoryExportMarketPlace(this, "+row["ID"]+")'></button></div>";

	return text;
}

tableModify.mappingColsInfoSeparate = function(data) {
	
	return {
		keys : Object.keys(data),
		values : Object.values(data),
	};

}

tableModify.mappingColsID = function(text, field, row, config, addData) {

	let comment = JSON.parse(row["comment"]);
	let key = comment["key"].replace(".", "DOTT");
	let attributeId = comment["attributeId"] ?? null;
	
	let html = ["", ""];
	
	if (addData?.["mappingColsInfo"]) {

		if (addData["mappingColsInfo"].includes(key)) {
			html = ["<div style='user-select: none;' class='small'>", "</div>"];

		}
	}
	
	if (addData?.["mappingOptionSet2"]) {

		let cols = tableModify.mappingColsInfoSeparate(addData["mappingOptionSet2"]);

		if (cols["values"].includes(key)) {
			html = ["<div style='user-select: none;' class='small'>", "</div>"];
		}
	}
	
	text = html[0]+text+html[1];
	return text;
}

tableModify.mappingColsInfo = function(text, field, row, config, addData) {
	
	text = "";
	let comment = JSON.parse(row["comment"]);
	let key = comment["key"].replace(".", "DOTT");
	if (/^\d/.test(key)) {// Назва методу не  може починатися з цифри
		key = "_" + key;
	}	
	let attributeId = comment["attributeId"] ?? null;
		
	if (addData?.["mappingColsInfo"]) {

		if (addData["mappingColsInfo"].includes(key)) {
			text = "method";
		}
	}
	
	let cols;
	
	if (addData?.["mappingOptionSet2"]) {

		cols = tableModify.mappingColsInfoSeparate(addData["mappingOptionSet2"]);
		
		if (cols["values"].includes(key)) {
			text = "optionSet-key";
		} else {

			if (
				attributeId !== null
				&& cols["keys"].includes(attributeId.toString())
			) {
				text = "optionSet-attributeId";
			}
		}

	}
		
	if (addData?.["mappingPropertySet2"]) {
		cols = tableModify.mappingColsInfoSeparate(addData["mappingPropertySet2"]);

		if (cols["values"].includes(key)) {
			text = "propertySet-key";
		} else {

			if (
				attributeId !== null
				&& cols["keys"].includes(attributeId.toString())
			) {
				text = "propertySet-attributeId";
			}
		}		
	}
	
	return text;
}

tableModify.getMappingOptionSet = function(text, field, row, config, addData) {
	
	text = "" ;

	if (
		row["parent"]
		&& addData?.["mappingOptionSet2"]?.[row?.["parent"]]
	) {//є співставлення
		
		let isSelect = "";

		if (
			["select", "multiselect"].includes(addData["mappingOptionSet2"][row["parent"]]["type"])
		) {

			let params = {
				"h": "table",
				"a": {
					"name": "mappingOptionList",
					"section": "toModal",
					"target": 1,
					"filterFixed": [
						"mappingOptionSet"
					],
					"filter": {
						"mappingOptionSet"	:	addData["mappingOptionSet2"][row["parent"]]["ID"]
					},
					/*"add"	:	{
						"optionSet"		:	row["parent"],
						"attributeID"	:	addData["mappingOptionSet2"][row["parent"]]["attributeID"],
					}*/
				},
				"header": addData["mappingOptionSet2"][row["parent"]]["name"],
			};
			
			let paramsWSelect = {
				"h": "table",
				"a": {
					"name": "mappingOptionList",
					"section": "toModal",
					"target": 1,
					"config": 'mappingOptionListWithSelect',
					"filterFixed": [
						"mappingOptionSet"
					],
					"filter": {
						"mappingOptionSet"	:	addData["mappingOptionSet2"][row["parent"]]["ID"]
					},
					/*"add"	:	{
						"optionSet"		:	row["parent"],
						"attributeID"	:	addData["mappingOptionSet2"][row["parent"]]["attributeID"],
					}*/
				},
				"header": addData["mappingOptionSet2"][row["parent"]]["name"],
			};

			isSelect = "<button type='button' data-href='"+tools.transformObjToStr(paramsWSelect)+"' onclick='runTools.insertHModal(this);return false' class='las la-list-alt' title='Співставлення опцій з select'></button><button type='button' data-href='"+tools.transformObjToStr(params)+"' onclick='runTools.insertHModal(this);return false' class='las la-list' title='Співставлення опцій по ID'></button>";
		}

		text += "<div class='toolbar'>";
		
			text += "<div class='mappingOptionSet'>";
			
			text += addData["mappingOptionSet2"][row["parent"]]["name"] + " <span class='small'>("+ addData["mappingOptionSet2"][row["parent"]]["type"]+")</span> <span class='btn h-20' onclick='shopTools.deleteRowMappingOptionSet(this,"+addData["mappingOptionSet2"][row["parent"]]["ID"]+")'>x</span>";
			
			text += "</div>";//.mappingOptionSet
		
			text += isSelect;

		text += "</div>";//.toolbar
		
	} else {

		let listExcludeParent = ["254","1"];//OptionSet.ID, які треба виключити, так як вони співставляються інакше
		if (!listExcludeParent.includes(row["parent"])) {
			text += "<div class='toolbar'><textarea></textarea><button title='Додати' type='button' onclick='shopTools.addRowMappingOptionSet(this,"+row["parent"]+",2)'>+</button></div>";
		} else {
			
			switch (row["parent"]) {
				case "254":
					text += "<div class='small'>"+row["parent"]+": <a href='/p/run/h=table&a%5Bname%5D=mappingPropertySet&a%5Bfilter%5D%5BID%5D=%3D%7C1&a%5Bfilter%5D%5BmarketPlace%5D=2' target='_black'>співставлення тут</a></div>";
				break;
				case "1":
					text += "<div class='small'>"+row["parent"]+": <a href='/p/run/h=table&a%5Bname%5D=mappingBrandList' target='_black'>співставлення тут</a></div>";
				break;
			}
			

		}

	}
	
	return text;
}

runTools.deleteImagesWData = function(o, articleID) {
	
		var args = {
			h	:	"exec",
			a	:	{
				work	:	1,
				name	:	"deleteImagesWData",
			},
			articleID	:	articleID,
		};
		
		let deleted = confirm(library.get("You want to delete All Images table ") + library.get("article")+ ", ID: "+articleID+". "+library.get("Are you sure?"));
		
		if (deleted) {
			
			ajax.start(args, o).then(
			
				function(d) {
					
					d = ajax.end(d, o);
					
					if (d["info"]["success"]) {//успішно
						
						if (d["action"] != undefined) {//команда з PHP
							
							var tmp = Object.keys(d["action"])[0].split("::");

							if (tmp[1] != undefined) {//є class та method, запускаємо, та передаємо туди об'єкт-ініціатор
								
								Factory.create(tmp[0])[tmp[1]](Object.values(d["action"])[0], o);
								
							}
							
						}
						
						vNotify.info({text: d["info"]["text"],visibleDuration:1000,showClose:false});
						
					} else {
						
						vNotify.error({text: d["info"]["text"],visibleDuration:10000});
						
					}
				}
				
			);
			
		}
		
}

runTools.runDashBoard = function () {//нічого не виводимо

};

runTools.optionGetUsed = function (data, usedData) {

	let html, value, attr, res = [{
		"value"	:	"",
		"html"	:	"—",
	}];
	
	if (data) {

		for (var i = 0; i < data[0].length; i++) {

			html = data[1][i];
			value = data[0][i];

			attr = {
				"value"	:	value,
				"html"	:	html,
			};
			console.log(usedData);
			if (
				usedData
				&& (usedData.includes(value.toString()) || usedData.includes(value))
			) {

				attr["class"] = "used";
			}
			
			res.push(attr);
			
		}
	}

	return res;
}

runTools.optionGetFromAddDataForOptionList = function (name, addData) {
		
	var res = null;

	if (addData?.[name]) {

		res = runTools.optionGetUsed(addData[name], addData["usedOptionList"] ?? null);
	}

	return res;
};

runTools.optionGetFromAddDataForAttributeOption = function (name, addData) {

	var res = null;
	
	if (addData?.[name]) {
		res = runTools.optionGetUsed(addData[name], addData["usedAttributeOption"] ?? null);
	}

	return res;
		
};

//tools.tracker.end("run");
//console.log("run duration: " + tools.tracker.measure("run").duration);
