import { Component, Host, State, h } from '@stencil/core';
import datas from './data/allInfos.json';


interface corpse {
  id: string;
  type: string;
  buff: 'more' | 'less' | 'rating';
  value: number;
}

interface AffixTier {
  parentId: string;
  type: string;
  name: string;
  tier: string;
  weigth: string;
  ilvl: string;
}

interface Affix {
  id: string;
  type: string;
  name: string;
  ntiers: string;
  weigth: string | number;
  ilvl: string;
  tags: string[];
  tiers?: AffixTier[];
  score?: number;
  removedTier?: number;
}


@Component({
  tag: 'necro-component',
  styleUrl: 'necro-component.scss',
  shadow: true,
})
export class NecroComponent {

  allAffixTypes: string[] = [];

  @State() selectedTypeBuff: 'more' | 'less' | 'rating';
  selectedType: string;
  selectedTypeValue: number;

  @State() corpseList: corpse[] = [];
  @State() displayTiers: string[] = [];


  @State() dataAffix: Affix[][];

  componentDidLoad() {
    this.getAllAffixType();
  }


  selectDatas(searchType: string) {
    console.log('selectDatas', datas, searchType)
    this.dataAffix = datas.find(({ type }) => type === searchType).datas;
    this.getAllAffixType();
  }

  getAllAffixType() {
    this.allAffixTypes = [...new Set(this.dataAffix?.flat().map(({ tags }) => tags).flat())];
  }

  isTierRemoved(totalTier: number, currentTier: number, rating: number): boolean {
    if (!rating) {
      return false;
    }
    return Math.ceil(totalTier / (1 + (rating / 100))) < currentTier;
  }

  getRating(tags: string[]) {
    const allRating = this.corpseList.filter(({ type, buff }) => buff === 'rating' && tags.includes(type));

    return allRating.reduce((acc, { value }) => {
      return acc + value;
    }, 0)
  }

  getScore(tags: string[]) {
    const allRating = this.corpseList.filter(({ type, buff }) => buff !== 'rating' && tags.includes(type));
    return allRating.reduce((acc, { value, buff }) => {
      switch (buff) {
        case 'more':
          return acc + value;
        case 'less':
          return acc - value;
      }
    }, 0)
  }

  calcWeigth(data: Affix[]): Affix[] {
    return data.map(info => {

      let weigth = Number(info.weigth);

      let removedTier = 0;

      if (info.tiers) {
        let rating = this.getRating(info.tags);
        const globalweigth = info.tiers.reduce((acc, { weigth, tier }) => {
          if (this.isTierRemoved(Number(info.ntiers), Number(tier), rating)) {
            removedTier++;
            return acc;
          }
          return acc + Number(weigth)
        }, 0)

        weigth = globalweigth;
      }

      return {
        ...info,
        score: this.getScore(info.tags),
        removedTier,
        weigth: Math.floor(weigth)
      };
    })
  }

  manageWeight() {
    return 10
  }


  renderTierAffix(tiers: AffixTier[], ntiers: number, tags: string[]) {
    return tiers.map((tier) => <div class={`tier ${this.isTierRemoved(ntiers, Number(tier.tier), this.getRating(tags)) ? 'removed' : ''}`}>
      <div>{tier.name}</div>
      <div class="infos">
        <div class="affix-tier">({tier.tier})</div>
        <div>{tier.weigth}</div>
      </div>
    </div>)
  }

  calcScore(score: number, weight: number): number {
    if (!score) {
      return weight;
    }

    if (score > 0) {
      return Math.floor(weight + (weight * (score / 100)));
    } else if (score < 0) {
      return Math.floor(weight / (1 + (-score / 100)));
    }

  }

  toggle(idAffix: string) {
    if (this.displayTiers.includes(idAffix)) {
      this.displayTiers = this.displayTiers.filter(id => id !== idAffix);
      return;
    }
    this.displayTiers = [...this.displayTiers, idAffix];
  }

  renderAffix() {

    if (!this.dataAffix) {
      return;
    }

    return this.dataAffix.map((data) => {

      const sortedData = this.calcWeigth(data).sort((a, b) => {
        return this.calcScore(b.score, Number(b.weigth)) - this.calcScore(a.score, Number(a.weigth));
      });

      return <div class="affix-type">
        <div class="title">{data[0]?.type}</div>
        {sortedData.map(({ id, name, tags, weigth, tiers, ntiers, score, removedTier }) => {


          let infoWeight = this.calcScore(score, Number(weigth));
          if (score) {
            infoWeight = <div class="modified"><div class="more-info">({score},{weigth})</div>{infoWeight}</div>
          } else {
            infoWeight = <div>{infoWeight}</div>
          }

          let removedTierInfo;
          if (removedTier > 0) {
            removedTierInfo = <div class="removed-tier" title="number of tier removed">({removedTier})</div>
          }

          return (<div class="affix" onClick={() => this.toggle(id)}>
            <div class="main">
              <div class="info">
                <div>{name}</div>
                <div class="tags">
                  {tags?.map(tag => {
                    return <div class={`tag tag-${tag}`}>{tag}</div>
                  })}
                </div>
              </div>
              <div class="mini-info">
                {removedTierInfo}
                {infoWeight}
              </div>
            </div>
            <div class={`tiers ${this.displayTiers.includes(id) ? 'display' : ''}`} >{this.renderTierAffix(tiers, Number(ntiers), tags)}</div>
          </div>)
        })}
      </div>
    })
  }


  renderCim() {

    const options = [
      {
        buff: "more",
        text: "Increased chance",
        values: [100, 300, 500]
      },
      {
        buff: "less",
        text: "Scarcer",
        values: [100, 300]
      },
      {
        buff: "rating",
        text: "Tier Rating",
        values: [25, 50, 100]
      }
    ]


    return <div class="cim">
      <div class="title">CIMETERY</div>
      <div class="selector">
        <select onChange={(ev) => this.selectedType = (ev.currentTarget as HTMLSelectElement).value}>
          <option></option>
          {this.allAffixTypes.map(type => {
            return <option value={type}>{type}</option>
          })}
        </select>

        <select onChange={(ev) => {
          this.selectedTypeBuff = (ev.currentTarget as HTMLSelectElement).value as 'more' | 'less' | 'rating';
          this.selectedTypeValue = options.find(({ buff: optionBuff }) => optionBuff === this.selectedTypeBuff).values[0]
        }}>
          <option></option>
          {
            options.map(({ buff, text }) => <option value={buff}>{text}</option>)
          }
        </select>
        <select onChange={(ev) => this.selectedTypeValue = Number((ev.currentTarget as HTMLSelectElement).value)}>
          {
            options.find(({ buff }) => buff === this.selectedTypeBuff)?.values.map((val) => <option value={val} selected={this.selectedTypeValue === val}>{val}</option>)
          }
        </select>

        <button onClick={(() => this.createCorps())}>Validate</button>
      </div>

      <div class="display">
        <div class="allCorpse">
          {this.corpseList.map(({ id, type, buff, value }) => {
            return <div class="corpse">
              <div class="remove" onClick={() => this.removeCorpse(id)}>X</div><div>{options.find(({ buff: optionBuff }) => optionBuff === buff).text}</div><div class={`tag tag-${type}`}>{type}</div> <div>{value}</div></div>
          })}
        </div>

        <div class="allCorpseRecap">
        </div>
      </div>
    </div >
  }

  removeCorpse(corpseId: string) {
    this.corpseList = this.corpseList.filter(({ id }) => id !== corpseId);
  }

  createCorps() {
    this.corpseList = [...this.corpseList,
    {
      id: "id" + Math.random().toString(16).slice(2),
      type: this.selectedType,
      buff: this.selectedTypeBuff,
      value: this.selectedTypeValue
    }
    ];
  }

  renderSelectBase() {
    return <div>
      <input list="itemBase" onInput={(ev) => this.selectDatas(((ev.currentTarget as HTMLInputElement).value))}></input>
      <datalist id="itemBase">
        {datas.map(({ type }) => <option value={type}></option>)}
      </datalist>
      {/* 
      {datas.map(({ type }) => <button onClick={() => this.selectDatas((type))}>{type.replace('data-', '').replace('.json', '').replace('-', ' ')}</button>)} */}
    </div>
  }

  render() {
    return (
      <Host>
        {this.renderSelectBase()}
        {this.renderCim()}
        <div class="affixs">
          {this.renderAffix()}
        </div>
      </Host>
    );
  }

}
