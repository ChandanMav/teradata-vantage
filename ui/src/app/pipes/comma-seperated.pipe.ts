import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'commaSeperated'
})
export class CommaSeperatedPipe implements PipeTransform {

  transform(value: String[], seperator: String = ","): String {
    let s = "";
    if (!value) {
      return s;
    }

    for (let i = 0; i < value.length; i++) {
      if (i === value.length - 1) {
        s = s + value[i];
        break;
      }
      s = s + value[i] + ", "
    }

    return s;
  }

}
