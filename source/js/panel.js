class Panel {
	constructor() {
		this._dom = {
			log: document.querySelector("#log"),
			clear: document.querySelector("#clear"),
		};


		this._dom.clear.addEventListener("click", this);
		this._dom.log.addEventListener("click", this);

		chrome.devtools.network.onRequestFinished.addListener(e => { this._processItem(e); });
		chrome.devtools.network.onNavigated.addListener(() => { this._clear(); });

	}

	handleEvent(e) {
		if (e.target == this._dom.clear) {
			this._clear();
		}
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
			if ("action" in dObj) {
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
