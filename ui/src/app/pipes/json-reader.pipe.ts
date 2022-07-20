import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'jsonReader',
})
export class JsonReaderPipe implements PipeTransform {
  transform(value: any, keys: string[]): string[] {
    let d = [];
    if (!value || !keys) {
      return [''];
    }

    for (let key in keys) {
      d.push(value[keys[key]]);
    }

    return d;
  }
}
