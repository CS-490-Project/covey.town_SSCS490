import Interactable, { KnownInteractableTypes } from '../Interactable';

export default class JukeboxArea extends Interactable {
  private _labelText?: Phaser.GameObjects.Text;

  private _defaultMusicURL?: string;

  private _isInteracting = false;

  public get defaultMusicURL() {
    if (!this._defaultMusicURL) {
      return 'No URL found';
    }
    return this._defaultMusicURL;
  }

  addedToScene() {
    super.addedToScene();
    this.setTintFill();
    this.setAlpha(0.3);

    this._defaultMusicURL = this.getData('music');
    this._labelText = this.scene.add.text(
      this.x - this.displayWidth / 2,
      this.y - this.displayHeight / 2,
      `Press space to play music from ${this.name}`,
      { color: 'white', backgroundColor: 'blue' },
    );
    this._labelText.setVisible(false);
    this.setDepth(-1);
  }

  overlap(): void {
    if (!this._labelText) {
      throw new Error('Should not be able to overlap with this interactable before added to scene');
    }
    const location = this.townController.ourPlayer.location;
    this._labelText.setX(location.x);
    this._labelText.setY(location.y);
    this._labelText.setVisible(true);
  }

  overlapExit(): void {
    this._labelText?.setVisible(false);
    if (this._isInteracting) {
      this.townController.interactableEmitter.emit('endInteraction', this);
      this._isInteracting = false;
    }
  }

  interact(): void {
    this._labelText?.setVisible(false);
    this._isInteracting = true;
  }

  getType(): KnownInteractableTypes {
    return 'jukeboxArea';
  }
}
