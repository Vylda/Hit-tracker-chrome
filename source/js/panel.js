class Panel {
	constructor() {
		this._dom = {
			log: document.querySelector("#log"),
			clear: document.querySelector("#clear"),
			filter: document.querySelector("#filter"),
			filterValue: document.createElement("input"),
			isRegexInput: document.createElement("input"),
			isCaseSensitive: document.createElement("input"),
			filterContainer: document.createElement("div")
		};

		this._filterOpen = false;

		this._dom.filterContainer.id = "filter-container";

		this._dom.filterValue.setAttribute("type", "text");
		this._dom.filterValue.addEventListener("input", (e) => {
			if (this._dom.isRegexInput.checked) {
				this._testRegex(this._dom.filterValue.value);
			} else {
				this._dom.filterValue.removeAttribute("style");
			}
		});

		let label = document.createElement("label");
		label.title = "Jde o regulární výraz (RegExp)."
		this._dom.isRegexInput.setAttribute("type", 'checkbox');
		this._dom.isRegexInput.addEventListener("change", () => {
			if (this._dom.isRegexInput.checked) {
				this._testRegex(this._dom.filterValue.value);
			} else {
				this._dom.filterValue.removeAttribute("style");
			}
		})
		label.appendChild(this._dom.isRegexInput);
		label.appendChild(document.createTextNode("RegExp"));
		this._dom.filterContainer.appendChild(label);

		let labelCS = document.createElement("label");
		labelCS.title = "Citlivé na velikost písmen."
		this._dom.isCaseSensitive.setAttribute("type", 'checkbox');
		labelCS.appendChild(this._dom.isCaseSensitive);
		labelCS.appendChild(document.createTextNode("aA"));

		this._dom.filterContainer.appendChild(this._dom.filterValue);
		this._dom.filterContainer.appendChild(label);
		this._dom.filterContainer.appendChild(labelCS);

		this._dom.clear.addEventListener("click", this);
		this._dom.filter.addEventListener("click", this);
		this._dom.log.addEventListener("click", this);

		chrome.devtools.network.onRequestFinished.addListener(e => { this._processItem(e); });
		chrome.devtools.network.onNavigated.addListener(() => { this._clear(); });

	}

	handleEvent(e) {
		if (e.target == this._dom.clear) {
			this._clear();
		} else if (e.target.closest("button") == this._dom.filter) {
			if (!this._filterOpen) {
				document.body.appendChild(this._dom.filterContainer);
				this._filterOpen = true;
			} else {
				this._dom.filterContainer.remove();
				this._filterOpen = false;
			}
		}
	}

	_testRegex(re) {
		this._dom.filterValue.removeAttribute("style");
		if (!re) {
			return true;
		}
		try {
			let reo = new RegExp(re.trim(), this._dom.isCaseSensitive.checked ? "" : "i");
			return reo;
		} catch (e) {
			this._dom.filterValue.style.color = "red";
			return false;
		}
	}

	_filterData(text) {
		this._dom.filterValue.removeAttribute("style");
		if (!text) { return true; }
		let filterText = this._dom.filterValue.value.trim();
		if (!filterText) { return true; }

		if (this._dom.isRegexInput.checked) {
			let re = this._testRegex(filterText);
			if (re) {
				return re.test(text);
			}
			return true;
		}
		if (this._dom.isCaseSensitive.checked) {
			return text.includes(filterText);
		}
		return text.toLowerCase().includes(filterText.toLowerCase());
	}

	/**
	 * Vyčistí tabulku
	 */
	_clear() {
		this._dom.log.innerHTML = "";
	}

	_toConsole(data) {
		let cmd = `console.log(${JSON.stringify(data)})`;
		chrome.devtools.inspectedWindow.eval(cmd);
	}

	_makeLine(row, d) {
		try {
			let dObj = JSON.parse(d)
			if ("action" in dObj && this._filterData(d)) {
				let action = "", data = [], keys = Object.keys(dObj).sort();

				keys.forEach(key => {
					if (key == "action" && !action) {
						action = dObj.action;
					} else {
						data.push({ "name": key, "value": dObj[key] });
					}
				});

				let rowNumber = row.insertCell();
				rowNumber.textContent = row.parentNode.children.length;

				let actionCell = row.insertCell();
				actionCell.textContent = action;
				actionCell.className = "action";

				let paramNameCell = row.insertCell();
				let paramValueCell = row.insertCell();

				paramValueCell.onclick = () => {
					let dataToConsole = Object.assign({}, dObj);
					console.log(dataToConsole);
					this._toConsole(dataToConsole);
				};

				data.forEach(dt => {
					let name = document.createElement("span");
					let value = document.createElement("span");

					name.textContent = dt.name;
					value.textContent = JSON.stringify(dt.value);

					paramNameCell.appendChild(name);
					paramValueCell.appendChild(value);
				});
			}
		} catch (err) {
			let errorCell = row.insertCell();
			errorCell.textContent = err;
			errorCell.setAttribute("colspan", 4);
			console.error(err);
		}
	}

	_processItem(e) {
		if (!e.request || !e.request.url) {
			return;
		}

		let regex = /^https?:\/\/h.imedia.cz\/hit\//;
		if (!regex.test(e.request.url)) {
			return;
		}

		let url = new URL(e.request.url)
		if (url && url.searchParams) {
			let d = url.searchParams.get("d");
			if (d) {
				let down = (window.innerHeight + window.scrollY) >= document.body.offsetHeight;
				let row = this._dom.log.insertRow();
				this._makeLine(row, d);
				if (down) {
					window.scrollTo(0, document.body.scrollHeight);
				}
			}
		}
	}

}

new Panel();
