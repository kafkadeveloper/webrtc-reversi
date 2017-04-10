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

document.querySelector("#createRoomButton").addEventListener("click", function() {
	connection = new P2PHostConnection()

	connection.addEventListener("dcOpen", () => {
		console.log("Datachannel connected")
		writeToChatLog("Datachannel connected", "text-success")
		App.router.setRoute("/game")
	})

	connection.addEventListener("dcMessage", (e) => {
		console.log("Got message (host)", e.detail)

		writeToChatLog(e.detail.message, "text-info")
	})

	connection.createOffer()
	.then((offerDesc) => {
		console.log("Created local offer", offerDesc)
		document.querySelector("#localOfferText").innerText = JSON.stringify(offerDesc)
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
		App.router.setRoute("/game")
	})

	connection.addEventListener("dcMessage", (e) => {
		console.log("Got message (joiner)", e.detail)

		writeToChatLog(e.detail.message, "text-info")
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
		document.querySelector("#localAnswerText").innerText = JSON.stringify(answerDesc)
		App.router.setRoute("/join-room/send-answer")
	})
	.catch(() => {
		console.warn("Could not create offer")
	})
})

document.querySelector("#sendMessageButton").addEventListener("click", function() {
	let messageBox = document.querySelector("#messageTextBox")

	if (messageBox.value) {
		writeToChatLog(messageBox.value, "text-success")

		connection.sendMessage(messageBox.value)

		messageBox.value = ""
	}

	return false
})
