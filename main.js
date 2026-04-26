"use strict";
const log = console.log.bind(console),
	$ = document.querySelector.bind(document),
	$$ = document.createElement.bind(document);
// html elements
const body = document.body;
const header = $("#header"),
	typing = $("#typing-area"),
	first = $("#l1"),
	second = $("#l2"),
	third = $("#l3"),
	timer = $("#timer"),
	t15 = $("#t15"),
	t30 = $("#t30"),
	t60 = $("#t60"),
	t120 = $("#t120");
let game_status = new Proxy(
	{
		ready: false,
		allow_typing: true,
		left_time: 0,
		last_time_stamp: 0,
		timer: undefined,
		interval: undefined,
		original_time: 0,
	},
	{
		set(target, key, new_value) {
			target[key] = new_value;
			switch (key) {
				case "ready": {
					on_load();
					break;
				}
			}
			return new_value;
		},
	}
);

class stack {
	/**
	 *
	 * @param {any[]} data
	 */
	constructor(data) {
		this.stack = data || [];
	}
	push(data) {
		this.stack.push(data);
	}
	pop() {
		if (this.stack.length === 0) {
			throw new Error("Too much pop");
		}
		let _ = this.stack.at(-1);
		this.stack.length--;
		return _;
	}
	top() {
		return this.stack.at(-1);
	}
	/**
	 * @returns {boolean}
	 */
	is_empty() {
		return this.stack.length === 0;
	}
}

/**
 *
 * @param {any[]} lis
 * @returns {any}
 */
function random_choose(lis) {
	return lis[Math.floor(lis.length * Math.random())];
}
/**
 * @type {string[]}
 */
const texts = [];
(async function () {
	// fetch data
	const response = await fetch("./texts.json");
	if (response.statusText == "OK") {
		const data = await response.json();
		for (const piece of data) {
			texts.push(piece.content);
		}
		game_status.ready = true;
	} else {
		game_status.ready = false;
	}
})();
/**
 * @type {function()}
 */
const remove_loading = (function () {
	const div = $$("div");
	div.classList.add("loading");
	div.setHTMLUnsafe(
		"Data is loading... Please wait, and thankyou for your patient"
	);
	body.appendChild(div);
	function remove_loading() {
		div.remove();
	}
	return remove_loading;
})();

function on_load() {
	remove_loading();
	body.addEventListener("keydown", start_typing());
	body.addEventListener("click", pause_typing);
	pause_typing();
}

function pause_typing() {
	game_status.allow_typing = false;
	game_status.left_time = new Date() - game_status.last_time_stamp;
	clearTimeout(game_status.timer);
	clearInterval(game_status.interval);
}
/**
 * @param {string[]} data
 * @param {int} line_index
 * @param {HTMLSpanElement[][]} span_list
 * @param {boolean} increase
 */
function load(data, line_index, span_list, increase) {
	const line = [];
	if (increase) {
		if (span_list.length === 3) {
			span_list.splice(0, 1);
		}
		if (line_index > data.length - 2) {
			return;
		}
		for (const piece of data[line_index]) {
			for (const char of piece) {
				const span = $$("span");
				span.setHTMLUnsafe(char);
				span.classList.add("token", "untyped");
				line.push(span);
			}
			const span = $$("span");
			span.innerHTML = " ";
			span.classList.add("token", "untyped");
			line.push(span);
		}
		span_list.push(line);
	} else {
		if (span_list.length === 3) {
			span_list.pop();
		}
		if (line_index < 2) {
			return;
		}
		for (const piece of data[line_index]) {
			for (const char of piece) {
				const span = $$("span");
				span.setHTMLUnsafe(char);
				span.classList.add("token", "untyped");
				line.push(span);
			}
			const span = $$("span");
			span.innerHTML = " ";
			span.classList.add("token", "untyped");
			line.push(span);
		}
		span_list.splice(0, 0, line);
	}
}
/**
 *
 * @param {HTMLSpanElement[][]} span_list
 */
function render(span_list) {
	const temp = (div, line) => {
		const frag = document.createDocumentFragment();
		for (const span of line) {
			frag.appendChild(span);
		}
		div.appendChild(frag);
	};
	first.innerHTML = "";
	second.innerHTML = "";
	third.innerHTML = "";
	if (span_list.length === 3) {
		temp(first, span_list[0]);
		temp(second, span_list[1]);
		temp(third, span_list[2]);
	} else {
		temp(second, span_list[0]);
		temp(third, span_list[1]);
	}
}

/**
 *
 * @param {string} str
 * @returns {string[][]}
 */
function split2lines(str) {
	const data = str.split(" ").toReversed();
	const result = [],
		temp = [],
		width = parseInt(getComputedStyle(typing).width);
	let sum = 0;
	while (data.length > 0) {
		sum += (data.at(-1).length + 1) * 18;
		if (width < sum) {
			sum = (data.at(-1).length + 1) * 18;
			result.push([...temp]);
			temp.length = 0;
		}
		temp.push(data.at(-1));
		data.length--;
	}
	if (temp) {
		result.push(temp);
	}
	return result;
}

const alphabet = [
	..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ,.-",
];
alphabet.push("Backspace");
let correct = 0,
	wrong = 0,
	left = 0;
function start_typing() {
	const total = [...split2lines(random_choose(texts))],
		word_stack = new stack(Array.from(total.flat().join(" ")).toReversed()),
		another_stack = new stack();
	left = total.flat().join(" ").length;
	let index = 0,
		line_index = 0;
	/**
	 * @type {HTMLSpanElement[][]}
	 */
	const span_list = [];
	load(total, 0, span_list, true);
	load(total, line_index + 1, span_list, true);
	render(span_list);
	body.addEventListener("keydown", (e) => {
		if (
			!game_status.allow_typing ||
			alphabet.findIndex((v, _, __) => v === e.key) < 0
		)
			return;
		if (e.key === "Backspace") {
			index--;
			if (index < 0) {
				if (line_index > 0) {
					index = span_list[--line_index].length - 1;
					load(total, line_index, span_list, false);
					render(span_list);
				} else {
					index = 0;
					if (!another_stack.is_empty()) {
						word_stack.push(another_stack.top());
						another_stack.pop();
					}
					return;
				}
			} else {
				left++;
				word_stack.push(another_stack.top());
				another_stack.pop();
			}
			const el = span_list[line_index][index];
			if (el.classList.contains("right")) correct--;
			else if (el.classList.contains("wrong")) wrong--;
			el.classList.remove("right", "wrong");
			el.classList.add("untyped");
		} else {
			const el = span_list[line_index][index];
			el.classList.remove("untyped", "right", "wrong");
			if (word_stack.top() === e.key) {
				log("Ok!");
				correct++;
				el.classList.add("right");
			} else {
				log("Wrong!", word_stack.top());
				el.classList.add("wrong");
			}
			another_stack.push(word_stack.top());
			word_stack.pop();
			index++;
			if (index === span_list[line_index].length) {
				line_index++;
				index = 0;
				load(total, line_index + 1, span_list, true);
				render(span_list);
			}
		}
	});
	return () => {
		if (game_status.original_time > 0) {
			game_status.allow_typing = true;
			game_status.last_time_stamp = +new Date();
			game_status.timer = setTimeout(end_typing, game_status.left_time);
			game_status.interval = setInterval(loop, 1);
		}
	};
}
let last = 0;
function loop() {
	if (!game_status.allow_typing) return;
	if (new Date() - last === 0) return;
	last = new Date();
	if (game_status.left_time === 0) {
		pause_typing();
		end_typing();
	}
	timer.setHTMLUnsafe(`${(game_status.left_time / 1000).toFixed(3)}sec`);
	game_status.left_time--;
}
t15.addEventListener("click", () => {
	game_status.left_time = 15000;
	game_status.original_time = 15;
	loop();
	t15.classList.remove("on");
	t30.classList.remove("on");
	t60.classList.remove("on");
	t120.classList.remove("on");
	t15.classList.add("on");
});
t30.addEventListener("click", () => {
	game_status.left_time = 30000;
	game_status.original_time = 30;
	loop();
	t15.classList.remove("on");
	t30.classList.remove("on");
	t60.classList.remove("on");
	t120.classList.remove("on");
	t30.classList.add("on");
});
t60.addEventListener("click", () => {
	game_status.left_time = 60000;
	game_status.original_time = 60;
	loop();
	t15.classList.remove("on");
	t30.classList.remove("on");
	t60.classList.remove("on");
	t120.classList.remove("on");
	t60.classList.add("on");
});
t120.addEventListener("click", () => {
	game_status.left_time = 120000;
	game_status.original_time = 120;
	loop();
	t15.classList.remove("on");
	t30.classList.remove("on");
	t60.classList.remove("on");
	t120.classList.remove("on");
	t120.classList.add("on");
});
function end_typing() {
	timer.innerHTML = `${((correct * 12) / game_status.original_time).toFixed(2)}WPM; Accuracy: ${((correct / (correct + wrong + left)) * 100).toFixed(2)}%`;
}
