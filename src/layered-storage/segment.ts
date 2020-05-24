import { KeyValueLookup, LayerRange, Segment, KeyRange } from "./common";
import { LayeredStorageCore } from "./core";
import { LayeredStorageTransaction } from "./transactions";

/**
 * This is similar as `LayeredStorage` except that it is permanently bound to
 * given `LayeredStorage` and can only access a single `Segment`.
 *
 * @typeParam Layer - The allowed layers.
 * (TS only, ignored in JS).
 * @typeParam KV - The value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeParam Keys - The allowed keys.
 * (TS only, ignored in JS).
 */
export class LayeredStorageSegment<
  Layer extends LayerRange,
  KV extends KeyValueLookup<Keys>,
  Keys extends KeyRange = keyof KV
> {
  /**
   * Create a new storage instance for given segment.
   *
   * @param _core - The core of the Layered Storage instance.
   * @param segment - The segment this instance will manage.
   */
  public constructor(
    private readonly _core: LayeredStorageCore<Layer, KV, Keys>,
    public readonly segment: Segment
  ) {}

  /**
   * Retrieve a value.
   *
   * @param key - The key corresponding to the requested value.
   *
   * @returns The value or undefined if not found.
   */
  public get<Key extends Keys>(key: Key): KV[Key] | undefined {
    return this._core.get(this.segment, key);
  }

  /**
   * Check if a value is present.
   *
   * @param key - The key corresponding to the requested value.
   *
   * @returns True if found, false otherwise.
   */
  public has<Key extends Keys>(key: Key): boolean {
    return this._core.has(this.segment, key);
  }

  /**
   * Save a value.
   *
   * @param layer - Which layer to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  public set<Key extends Keys>(layer: Layer, key: Key, value: KV[Key]): void {
    this.runTransaction((transaction): void => {
      transaction.set(layer, key, value);
    });
  }

  /**
   * Delete a value from the storage.
   *
   * @param layer - Which layer to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  public delete<Key extends Keys>(layer: Layer, key: Key): void {
    this.runTransaction((transaction): void => {
      transaction.delete(layer, key);
    });
  }

  /**
   * Set the inherance chain of this segment.
   *
   * @param segments - The segments from which this segment will inherit.
   * @param global - Whether to inherit from global (as is the default) or not.
   */
  public setInheritance(segments: Segment[], global = true): void {
    this._core.setInheritance(this.segment, segments, global);
  }

  /**
   * Create a new segmented instance for working with a single segment with a
   * copy of another segments data.
   *
   * @param targetSegment - The target segment which should be created.
   *
   * @throws If the target segment already exists.
   *
   * @returns A new segmented instance permanently bound to this instance.
   */
  public cloneSegment(
    targetSegment: Segment
  ): LayeredStorageSegment<Layer, KV, Keys> {
    this._core.cloneSegmentData(this.segment, targetSegment);
    return new LayeredStorageSegment(this._core, targetSegment);
  }

  /**
   * Open a new transaction.
   *
   * @remarks
   * The transaction accumulates changes but doesn't change the content of the
   * storage until commit is called.
   *
   * @returns The new transaction that can be used to set or delete values.
   */
  public openTransaction(): LayeredStorageTransaction<Layer, KV, Keys> {
    return new LayeredStorageTransaction<Layer, KV, Keys>(
      this._core,
      this.segment
    );
  }

  /**
   * Run a new transaction.
   *
   * @remarks
   * This is the same as `openTransaction` except that it automatically commits
   * when the callback finishes execution. It is still possible to commit
   * within the body of the callback though.
   *
   * @param callback - This callback will be called with the transaction as
   * it's sole argument.
   */
  public runTransaction(
    callback: (transaction: LayeredStorageTransaction<Layer, KV, Keys>) => void
  ): void {
    const transaction = this.openTransaction();

    // If the following throws uncommited changes will get out of scope and will
    // be discarded and garbage collected.
    callback(transaction);

    transaction.commit();
  }

  /**
   * Export data in an object format.
   *
   * @remarks
   * All values will be fully expanded, all defaults will be applied etc. It's
   * like fetching all of them through .get().
   *
   * @param keys - The keys to export.
   *
   * @returns Object representation of given segments current data for
   * given keys.
   */
  public exportToObject(keys: Keys[]): void {
    return this._core.exportToObject(this.segment, keys);
  }

  /**
   * Delete all data belonging to this segment.
   */
  public close(): void {
    this._core.deleteSegmentData(this.segment);
  }
}
