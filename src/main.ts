import './style.css';
import { Game } from './game';
import { requireElement } from './features/ui/dom';

new Game(requireElement<HTMLCanvasElement>('game')).start();
