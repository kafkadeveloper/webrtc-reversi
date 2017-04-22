const BLACK = "black"
const WHITE = "white"

class ReversiGame {
	get localColor() { return this._localColor }
	set localColor(value) {
		this.boardElement.classList.add(`local-${value}`)

		this._localColor = value
	}

	get nextTurn() { return this._nextTurn }
	set nextTurn(value) {
		if (this._nextTurn) {
			this.boardElement.classList.remove(`next-${this._nextTurn}`)
		}

		this.boardElement.classList.add(`next-${value}`)

		this._nextTurn = value
	}

	constructor(connection, boardElement, localColor) {
		this.connection = connection
		this.boardElement = boardElement
		this.localColor = localColor
		this.remoteColor = (localColor === WHITE) ? BLACK : WHITE
		this.nextTurn = WHITE
		this.cellClicked = this.cellClicked.bind(this)
	}

	setupGameboard() {
		if (this.boardElement.children.length > 0) {
			for (let i = 0; i < 64; i++) {
				let cell = this.boardElement.children[i]

				cell.classList.remove(BLACK)
				cell.classList.remove(WHITE)

				if (i == 27 || i == 36) {
					cell.classList.add(BLACK)
				} else if (i == 28 || i == 35) {
					cell.classList.add(WHITE)
				}
			}
		} else {
			for (let i = 0; i < 64; i++) {
				let cell = document.createElement("div")

				cell.dataset.cellIndex = i
				cell.addEventListener("click", this.cellClicked)

				cell.classList.add("cell")

				if (i == 27 || i == 36) {
					cell.classList.add(BLACK)
				} else if (i == 28 || i == 35) {
					cell.classList.add(WHITE)
				}

				this.boardElement.appendChild(cell)
			}
		}
	}

	cellClicked(e) {
		if (this.nextTurn !== this.localColor) { return }

		let cell = e.currentTarget
		let cellIndex = cell.dataset.cellIndex

		this.boardElement.children[cellIndex].classList.add(this.localColor)

		this.connection.sendMessage({ type: "move", cell: cellIndex })

		this.nextTurn = this.remoteColor
	}

	processRemoteMove(cellIndex) {
		this.boardElement.children[cellIndex].classList.add(this.remoteColor)
		this.nextTurn = this.localColor
	}
}

let App = {
	get activePage() {
		return this._activePage
	},

	set activePage(newValue) {
		if (this._activePage) {
			this._activePage.classList.add("hidden")
		}

		newValue.classList.remove("hidden")
		this._activePage = newValue
	}
}

App.router = (new Router({
	"/home": function() {
		App.activePage = document.querySelector("#createOrJoinPage")
	},

	"/create-room": function() {
		App.activePage = document.querySelector("#showLocalOfferPage")
	},

	"/create-room/await-answer": function() {
		App.activePage = document.querySelector("#getRemoteAnswerPage")
	},

	"/join-room": function() {
		App.activePage = document.querySelector("#getRemoteOfferPage")
	},

	"/join-room/send-answer": function() {
		App.activePage = document.querySelector("#showLocalAnswerPage")
	},

	"/await-connection": function() {
		App.activePage = document.querySelector("#waitForConnectionPage")
	},

	"/game": function() {
		App.activePage = document.querySelector("#gamePage")
	}
})).init("/#/home")

let writeToChatLog = function(message, messageType) {
	let p = document.createElement("p")
	p.classList.add(messageType)
	p.innerText = `[${(new Date()).toLocaleTimeString()}] ${message}`
	document.querySelector("#chatlog").appendChild(p)
	document.querySelector("#chatlog").scrollTop = document.querySelector("#chatlog").scrollHeight
}

let connection
let reversiGame

let messageHandlers = {
	"chat": (message) => {
		writeToChatLog(message.text, "text-info")
	},
	"move": (message) => {
		reversiGame.processRemoteMove(message.cell)
	}
}

document.querySelector("#createRoomButton").addEventListener("click", function() {
	connection = new P2PHostConnection()

	connection.addEventListener("dcOpen", () => {
		console.log("Datachannel connected")
		writeToChatLog("Datachannel connected", "text-success")
		reversiGame = new ReversiGame(connection, document.querySelector("#gameBoard"), WHITE)
		reversiGame.setupGameboard()
		App.router.setRoute("/game")
	})

	connection.addEventListener("dcMessage", (e) => {
		console.log("Got message (host)", e.detail)

		if (messageHandlers[e.detail.message.type]) {
			messageHandlers[e.detail.message.type](e.detail.message)
		}
	})

	connection.addEventListener("iceCandidate", (e) => {
		document.querySelector("#localOfferText").innerText = JSON.stringify(e.detail)
	})

	connection.createOffer()
	.then((offerDesc) => {
		console.log("Created local offer", offerDesc)
		// document.querySelector("#localOfferText").innerText = JSON.stringify(offerDesc)
		App.router.setRoute("/create-room")
	})
	.catch(() => {
		console.log("Couldn't create local offer")
	})
})

document.querySelector("#answerReceivedButton").addEventListener("click", function() {
	let remoteAnswerInput = document.querySelector("#remoteAnswerInput")
	let answer = remoteAnswerInput.value
	remoteAnswerInput.value = ""

	let answerDesc = JSON.parse(answer)

	console.log("Received remote answer: ", answerDesc)
	writeToChatLog("Received remote answer", "text-success")

	connection.setAnswer(answerDesc)

	App.router.setRoute("/await-connection")
})

document.querySelector("#joinRoomButton").addEventListener("click", function() {
	connection = new P2PJoinerConnection()

	connection.addEventListener("dcOpen", () => {
		console.log("Datachannel connected")
		writeToChatLog("Datachannel connected", "text-success")
		reversiGame = new ReversiGame(connection, document.querySelector("#gameBoard"), BLACK)
		reversiGame.setupGameboard()
		App.router.setRoute("/game")
	})

	connection.addEventListener("dcMessage", (e) => {
		console.log("Got message (joiner)", e.detail)

		if (messageHandlers[e.detail.message.type]) {
			messageHandlers[e.detail.message.type](e.detail.message)
		}
	})

	connection.addEventListener("iceCandidate", (e) => {
		document.querySelector("#localAnswerText").innerText = JSON.stringify(e.detail)
	})

	App.router.setRoute("/join-room")
})

document.querySelector("#remoteOfferReceivedButton").addEventListener("click", function() {
	let remoteOfferInput = document.querySelector("#remoteOfferInput")
	let offer = remoteOfferInput.value
	remoteOfferInput.value = ""

	let offerDesc = JSON.parse(offer)
	connection.setOffer(offerDesc)

	console.log("Received remote offer", offerDesc)
	writeToChatLog("Received remote offer", "text-success")

	connection.createAnswer()
	.then((answerDesc) => {
		console.log("Created local answer: ", answerDesc)
		// document.querySelector("#localAnswerText").innerText = JSON.stringify(answerDesc)
		App.router.setRoute("/join-room/send-answer")
	})
	.catch(() => {
		console.warn("Could not create offer")
	})
})

document.querySelector("#chatContainer input").addEventListener("keypress", function(e) {
	if (event.which == 13 || e.keyCode == 13) {
		let messageBox = document.querySelector("#chatContainer input")

		if (messageBox.value) {
			writeToChatLog(messageBox.value, "text-success")

			connection.sendMessage({ type: "chat", text: messageBox.value })

			messageBox.value = ""
		}
	}
})
