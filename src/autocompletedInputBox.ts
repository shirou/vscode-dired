import * as vscode from 'vscode';

export function defaultFinishCondition(self: vscode.QuickPick<vscode.QuickPickItem>) {
    if (self.selectedItems.length == 0 || self.selectedItems[0].label == self.value) {
        return true;
    }
    else {
        self.value = self.selectedItems[0].label;
        return false;
    }
}

export async function autocompletedInputBox<T>(
    arg: {
        completion: (userinput: string) => Iterable<vscode.QuickPickItem>,
        withSelf?: undefined | ((self: vscode.QuickPick<vscode.QuickPickItem>) => any),
        stopWhen?: undefined | ((self: vscode.QuickPick<vscode.QuickPickItem>) => boolean)
    }) {
    const completionFunc = arg.completion;
    const processSelf = arg.withSelf;

    let finishCondition = defaultFinishCondition;
    if (arg.stopWhen != undefined)
        finishCondition = defaultFinishCondition


    const quickPick = vscode.window.createQuickPick();
    quickPick.canSelectMany = false;
    let disposables: vscode.Disposable[] = [];
    let result = quickPick.value;
    if (processSelf !== undefined)
        processSelf(quickPick);

    let makeTask = () => new Promise<void>(resolve => {
        disposables.push(
            quickPick.onDidChangeValue(directoryOrFile => {
                quickPick.items = Array.from(completionFunc(quickPick.value))
                return 0;
            }),
            quickPick.onDidAccept(() => {
                if (finishCondition(quickPick)) {
                    result = quickPick.value;
                    quickPick.hide();
                    resolve();
                }
            }),
            quickPick.onDidHide(() => {
                quickPick.dispose();
                resolve();
            })
        );
        quickPick.show();
    });
    try {
        await makeTask();
    }
    finally {
        disposables.forEach(d => d.dispose());
    }
    return quickPick.value;
}
