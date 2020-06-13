
export default class V2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	static add(v_1, v_2) {
		return new V2(v_1.x + v_2.x, v_1.y + v_2.y);
	}

	static get up() {
		return new V2(0, -1);
	}

	static get down() {
		return new V2(0, 1);
	}

	static get left() {
		return new V2(-1, 0);
	}

	static get right() {
		return new V2(1, 0);
	}
}