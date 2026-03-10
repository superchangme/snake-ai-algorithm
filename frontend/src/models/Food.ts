import { Coordinate } from '../types';

export class Food {
  position: Coordinate;

  constructor(x: number, y: number) {
    this.position = { x, y };
  }

  setPosition(x: number, y: number): void {
    this.position = { x, y };
  }

  getPosition(): Coordinate {
    return this.position;
  }
}
