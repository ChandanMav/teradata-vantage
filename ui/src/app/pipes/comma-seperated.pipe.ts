import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'commaSeperated'
})
export class CommaSeperatedPipe implements PipeTransform {

  transform(value: string[], seperator: String = ","): String {
    let s = "";
    if (!value) {
      return s;
    }

    for (let i = 0; i < value.length; i++) {
      if (i === value.length - 1) {
        s = s.trim() + value[i].trim();
        break;
      }
      s = s + value[i].trim() + ","
    }

    return s;
  }

}
