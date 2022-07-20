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
    for (let x = 0; x < arrayOfJson.length; x++) {
      let obj = arrayOfJson[x];
      let isInList = false;
      for (let i = 0; i < d.length; i++) {
        if (obj[key] === d[i]) {
          isInList = true;
          break;
        }
      }
      if (!isInList) {
        d.push(obj[key]);
      }
    }
    return d;
  }
}
