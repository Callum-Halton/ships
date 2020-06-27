
export default class Vector2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	static areEqual(a, b) {
		if (a.x === b.x && a.y === b.y) {
			return true;
		}
		return false;
	}

	static abs(a) {
		return new Vector2(Math.abs(a.x), Math.abs(a.y));
	}

	static add(a, b) {
		return new Vector2(a.x + b.x, a.y + b.y);
	}
	
	static sub(a, b) {
		return new Vector2(a.x - b.x, a.y - b.y);
	}
	
	static scale(a, n) {
		return new Vector2(a.x * n, a.y * n);
	}
	
	static floor(a) {
		return new Vector2(Math.floor(a.x), Math.floor(a.y));
	}
	
	static get up() {
		return new Vector2(0, -1);
	}

	static get down() {
		return new Vector2(0, 1);
	}

	static get left() {
		return new Vector2(-1, 0);
	}

	static get right() {
		return new Vector2(1, 0);
	}
}