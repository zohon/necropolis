import { Component, Host, State, Watch, h } from '@stencil/core';
import datas from './data/allInfos.json';


interface Corpse {
  id: string;
  type: string;
  buff: 'more' | 'less' | 'rating';
  value: number;
  active: boolean;
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

  @State() corpseList: Corpse[] = [];
  @State() displayTiers: string[] = [];
  @State() listSelectedAffix: Affix[] = [];

  @State() dataAffix: Affix[][];
  @State() globalRating: number;

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

  getRating(): number {
    return this.globalRating;
    // const allRating = this.corpseList.filter(({ type, buff }) => buff === 'rating' && tags.includes(type));

    // return allRating.reduce((acc, { value }) => {
    //   return acc + value;
    // }, 0)
  }

  getScore(tags: string[], corpse = this.corpseList, simulate = false) {
    const allRating = corpse.filter(({ type, buff, active }) => (simulate ? true : active) && buff !== 'rating' && tags.includes(type));
    return allRating.reduce((acc, { value, buff }) => {
      switch (buff) {
        case 'more':
          return acc + value;
        case 'less':
          return acc - value;
      }
    }, 0)
  }

  calcWeigth(data: Affix[], corpse = this.corpseList, simulate = false): Affix[] {
    return data.map(info => {

      let weigth = Number(info.weigth);

      let removedTier = 0;

      if (info.tiers) {
        let rating = this.getRating();
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
        score: this.getScore(info.tags, corpse, simulate),
        removedTier,
        weigth: Math.floor(weigth)
      };
    })
  }

  manageWeight() {
    return 10
  }


  renderTierAffix(tiers: AffixTier[], ntiers: number, score: number, totalWeight: number) {
    return tiers.map((tier) => {
      const weight = this.calcScore(score, Number(tier.weigth));
      const percent = Math.floor((weight / totalWeight) * 1000) / 10;
      return (
        <div class={`tier ${this.isTierRemoved(ntiers, Number(tier.tier), this.getRating()) ? 'removed' : ''}`}>
          <div>{tier.name}</div>
          <div class="infos">
            <div class="affix-tier">({tier.tier})</div>
            <div>{weight}  {percent}%</div>
          </div>
        </div>)
    })
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
    return weight;
  }

  toggle(idAffix: string) {
    if (this.displayTiers.includes(idAffix)) {
      this.displayTiers = this.displayTiers.filter(id => id !== idAffix);
      return;
    }
    this.displayTiers = [...this.displayTiers, idAffix];
  }


  getTotalWeight(typeSearch: string, corpse = this.corpseList, simulate = false) {

    let index = 0;
    while (this.dataAffix[index][0].type !== typeSearch) {
      index++;
    }

    const datas = this.dataAffix[index];

    const sortedData = this.calcWeigth(datas, corpse, simulate).sort((a, b) => {
      return this.calcScore(b.score, Number(b.weigth)) - this.calcScore(a.score, Number(a.weigth));
    });

    return sortedData.reduce((acc, info) => {
      return acc + this.calcScore(info.score, Number(info.weigth));
    }, 0)
  }

  renderAffix() {

    if (!this.dataAffix) {
      return;
    }

    return this.dataAffix.map((data) => {

      const sortedData = this.calcWeigth(data).sort((a, b) => {
        return this.calcScore(b.score, Number(b.weigth)) - this.calcScore(a.score, Number(a.weigth));
      });

      const totalWeight = sortedData.reduce((acc, info) => {
        return acc + this.calcScore(info.score, Number(info.weigth));
      }, 0)

      return <div class="affix-type">
        <div class="title">{data[0]?.type} - {totalWeight}</div>
        <div class="all-affix">
          {sortedData.map((affix) => {
            let { id, name, tags, weigth, tiers, ntiers, score, removedTier } = affix;

            let infoWeight = this.calcScore(score, Number(weigth));

            const percent = Math.floor((infoWeight / totalWeight) * 1000) / 10;

            if (score) {
              infoWeight = <div class={`modified ${infoWeight < Number(weigth) ? 'less' : 'more'}`} ><div class="more-info">({score},{weigth})</div> {infoWeight} {percent}%</div>
            } else {
              infoWeight = <div>{infoWeight} {percent}%</div>
            }

            if (tiers.length) {
              name = tiers[0].name;
            }

            let tierInfo;
            if (removedTier > 0 && tiers[removedTier]) {
              tierInfo = <div class="removed-tier" >(T{Number(ntiers) - removedTier})</div>
              name = tiers[removedTier].name;
            }

            return (<div class="affix" onClick={() => this.toggle(id)}>
              <div class="main">
                <div class="info">
                  <div class="name"><div>{tierInfo}</div>{name}</div>
                  <div class="tags">
                    {tags?.map(tag => {
                      return <div class={`tag tag-${tag}`}>{tag}</div>
                    })}
                  </div>
                </div>
                <div class="mini-info">
                  <div>{infoWeight}</div>
                  <button class={`fav ${this.listSelectedAffix.find(({ id }) => id === affix.id) ? 'active' : ''}`} onClick={(ev) => {
                    ev.stopPropagation();
                    this.toggleSelectAffix(affix)
                  }}></button>
                </div>

              </div>
              <div class={`tiers ${this.displayTiers.includes(id) ? 'display' : ''}`} >{this.renderTierAffix(tiers, Number(ntiers), score, totalWeight)}</div>
            </div>)
          })
          }
        </div>
      </div >
    })
  }


  toggleSelectAffix(affix: Affix) {
    if (this.listSelectedAffix.find(({ id }) => id === affix.id)) {
      this.listSelectedAffix = this.listSelectedAffix.filter(({ id }) => id !== affix.id);
    } else {
      this.listSelectedAffix = [...this.listSelectedAffix, affix];
    }
  }


  simulateAffix(corpses = this.corpseList) {
    const allAffixSorted = this.dataAffix.map((data) => {
      const sortedData = this.calcWeigth(data, corpses, true).sort((a, b) => {
        return this.calcScore(b.score, Number(b.weigth)) - this.calcScore(a.score, Number(a.weigth));
      });
      return {
        type: data[0].type,
        data: sortedData
      };
    });

    return this.listSelectedAffix.map(affixSelect => {
      const dataFromType = allAffixSorted.find(({ type }) => type === affixSelect.type).data;

      // we get position of target
      const position = dataFromType.findIndex((({ id }) => id === affixSelect.id));

      let infoWeight = this.calcScore(affixSelect.score, Number(affixSelect.weigth));

      const totalWeight = this.getTotalWeight(affixSelect.type, corpses, true);

      console.log('totalWeight', totalWeight, '/', infoWeight, affixSelect.name);

      const percent = Math.floor((infoWeight / totalWeight) * 1000) / 10;

      return {
        affix: affixSelect,
        position,
        percent
      }
    });
  }

  calcAllAffixOptimisation(corpse = this.corpseList) {
    const allAffixSorted = this.dataAffix.map((data) => {
      const sortedData = this.calcWeigth(data, corpse).sort((a, b) => {
        return this.calcScore(b.score, Number(b.weigth)) - this.calcScore(a.score, Number(a.weigth));
      });
      return {
        type: data[0].type,
        data: sortedData
      };
    });

    const allSelectedAffixTags = this.listSelectedAffix.reduce((acc, selectedAffix) => {
      const newTag = selectedAffix.tags.filter(tag => !acc.includes(tag));
      return [...acc,
      ...newTag]
    }, [])

    const idSelectedAffix = this.listSelectedAffix.map(({ id }) => id);

    const allAffixData = this.listSelectedAffix.map(affixSelect => {

      const dataFromType = allAffixSorted.find(({ type }) => type === affixSelect.type).data;

      // we get position of target
      const position = dataFromType.findIndex((({ id }) => id === affixSelect.id));

      //we get all better target
      let enemies = dataFromType.slice(0, position);

      // we remove our selected from enemi
      enemies = enemies.filter(({ id }) => !idSelectedAffix.includes(id));

      //we get all tags from enemies
      const enemiesTags = enemies.reduce((acc, enemi) => {
        const newTag = enemi.tags.filter(tag => !acc.includes(tag));
        return [...acc,
        ...newTag]
      }, [])

      const diffTagsDirect = enemiesTags.filter(enemiesTag => !affixSelect.tags.includes(enemiesTag));
      const conflict = enemiesTags.filter(enemiesTag => affixSelect.tags.includes(enemiesTag));
      const diffTagsWithoutInterferences = diffTagsDirect.filter(difTag => !allSelectedAffixTags.includes(difTag));
      return {
        more: affixSelect.tags.filter(enemiesTag => !conflict.includes(enemiesTag)),
        conflict: conflict,
        less: diffTagsWithoutInterferences
      }
    });

    // console.log('MORE', this.getPowerTag(allAffixData.map(({ more }) => more).flat()).map(({ name, number }) => `${name}(${number})`));
    // console.log('conflict', this.getPowerTag(allAffixData.map(({ conflict }) => conflict).flat()).map(({ name, number }) => `${name}(${number})`));
    // console.log('LESS', this.getPowerTag(allAffixData.map(({ less }) => less).flat()).map(({ name, number }) => `${name}(${number})`));

    return {
      more: this.getPowerTag(allAffixData.map(({ more }) => more).flat()),
      conflict: this.getPowerTag(allAffixData.map(({ conflict }) => conflict).flat()),
      less: this.getPowerTag(allAffixData.map(({ less }) => less).flat()),
    }
  }

  makeOptimisation() {

    const simulationAffix = this.simulateAffix();

    const infoPast = {
      nbCorpse: this.corpseList.length,
      score: simulationAffix.reduce((acc, { position }) => acc + position, 0),
      percent: simulationAffix.reduce((acc, { percent }) => acc + percent, 0)
    };

    const resultOpti = this.calcAllAffixOptimisation();

    let newCorpse = [];
    if (resultOpti.less.length) {
      newCorpse = [
        ...newCorpse,
        resultOpti.less.map(affixToReduce => {
          return {
            id: "id" + Math.random().toString(16).slice(2),
            type: affixToReduce.name,
            buff: 'less',
            value: 300,
            active: false
          }
        })
      ]
    }
    // if (resultOpti.more.length) {
    //   newCorpse = [
    //     ...newCorpse,
    //     resultOpti.more.map(affixToReduce => {
    //       return {
    //         id: "id" + Math.random().toString(16).slice(2),
    //         type: affixToReduce.name,
    //         buff: 'more',
    //         value: 500,
    //         active: false
    //       }
    //     })
    //   ]
    // }

    const newCorpseList = [
      ...this.corpseList,
      ...newCorpse.flat()
    ];

    console.log(newCorpseList);
    const simulationAffixPresent = this.simulateAffix(newCorpseList);

    console.log(simulationAffixPresent);
    const infoPresent = {
      nbCorpse: newCorpseList.length,
      score: simulationAffixPresent.reduce((acc, { position }) => acc + position, 0),
      percent: simulationAffixPresent.reduce((acc, { percent }) => acc + percent, 0)
    };

    if (infoPresent.percent > infoPast.percent) {
      console.log('improvement', infoPresent);
      this.corpseList = newCorpseList;
    } else {
      console.log('rollback', infoPresent, infoPast);
      // this.corpseList.splice(infoPast.nbCorpse, this.corpseList.length - infoPast.nbCorpse);
    }
  }


  getPowerTag(tagArray) {
    return tagArray.reduce((acc, item) => {
      const itemExist = acc.find(({ name }) => name === item);
      if (itemExist) {
        itemExist.number += 1;
      } else {
        acc.push({
          name: item,
          number: 1
        });
      }
      return acc;
    }, []).sort((a, b) => b.number - a.number)
  }


  renderCim() {

    const options = [
      {
        buff: "more",
        text: "Increased chance",
        increment: 500
      },
      {
        buff: "less",
        text: "Scarcer",
        increment: 300
      }
      // {
      //   buff: "rating",
      //   text: "Tier Rating",
      //   increment: 50
      // }
    ]



    return <div class="cim">
      <div class="selector">
        <div>Add Corpse</div>
        <select onChange={(ev) => this.selectedType = (ev.currentTarget as HTMLSelectElement).value}>
          <option></option>
          {this.allAffixTypes.sort().map(type => {
            return <option value={type}>{type}</option>
          })}
        </select>

        <select onChange={(ev) => {
          this.selectedTypeBuff = (ev.currentTarget as HTMLSelectElement).value as 'more' | 'less' | 'rating';
        }}>
          <option></option>
          {
            options.map(({ buff, text }) => <option value={buff}>{text}</option>)
          }
        </select>

        <button onClick={(() => {
          this.selectedTypeValue = options.find(({ buff: optionBuff }) => optionBuff === this.selectedTypeBuff).increment;
          this.createCorps()
        })}>Validate</button>


        <button onClick={() => this.makeOptimisation()} title="select affix (right box on affix line) to generate affix to remove">OPTIMISE</button>
        <button onClick={() => this.corpseList = []} title="Clean all corpse">Clean</button>

      </div>

      <div class="rating-management">
        <div>Global rating</div>
        <input type="range" min="0" step="50" max={50 * 30}
          value={this.globalRating}
          onInput={(ev) => this.globalRating = Number((ev.currentTarget as HTMLInputElement).value)}></input>
        {this.globalRating}
      </div>

      <div class="display">
        <div class="allCorpse">
          {this.corpseList.map(({ id, type, buff, value, active }) => {

            const corpseType = options.find((option) => option.buff === buff);

            return <div class={`corpse ${active ? 'active' : ''}`}>
              <div class="actions">
                <div class="remove" title="remove corpse" onClick={() => this.removeCorpse(id)}>X</div>
                <div class="display" title="active or deactive corpse" onClick={() => this.setCorpseValue(id, 'active', !active)}>O</div>
              </div>
              <div class="content">
                <div>{options.find(({ buff: optionBuff }) => optionBuff === buff).text}</div>
                <div class={`tag tag-${type}`}>{type}</div>
                <div>
                  <input type="range" min="0" step={corpseType.increment} max={corpseType.increment * 10}
                    value={value}
                    onInput={(ev) => this.setCorpseValue(id, 'value', (ev.currentTarget as HTMLInputElement).value)}></input>
                  {value}
                </div>
              </div>
            </div>
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

  setCorpseValue(corpseId: string, target: string, value: any) {
    this.corpseList = this.corpseList.map((corpse) => {
      if (corpse.id === corpseId) {
        corpse[target] = value;
      }
      return corpse;
    });
  }

  createCorps() {
    this.corpseList = [...this.corpseList,
    {
      id: "id" + Math.random().toString(16).slice(2),
      type: this.selectedType,
      buff: this.selectedTypeBuff,
      value: this.selectedTypeValue,
      active: true
    }
    ];
  }

  renderSelectBase() {
    return <div class="header">
      <div>Select Base type :</div>
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
