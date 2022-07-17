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

    //console.log(value);
    //console.log(keys);

    for (let key in keys) {
      //console.log(key);
      //console.log(value[keys[key]]);
      d.push(value[keys[key]]);
    }

    return d;
  }
}
