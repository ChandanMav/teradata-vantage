import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'extactData'
})
export class ExtactDataPipe implements PipeTransform {
  transform(arrayOfJson: any, key: any): string[] {
    let d = [];
    if (!arrayOfJson || !key) {
      return [''];
    }

    for (let jsonobj in arrayOfJson) {
      d.push(jsonobj[key]);
    }

    return d;
  }
}
