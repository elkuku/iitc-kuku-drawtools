export class MergeControl {
    status = true;

    readonly toggle = (): void => {
        this.status = !this.status;
    };
}
