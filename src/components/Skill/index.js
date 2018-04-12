import React from 'react'
import './index.scss'
const debug = require('debug')('app')
import { js_beautify as beautify } from 'js-beautify'
import * as requests from './requests.json'

class Skill extends React.Component {
  constructor(props) {
    super(props);

    this.doRequest = this.doRequest.bind(this);
    this.createRequest = this.createRequest.bind(this);
    this.setRequest = this.setRequest.bind(this);
    this.copyLastAttributes = this.copyLastAttributes.bind(this);

    this.state = {
      request: this.createRequest(props),
      validRequest: true,
      alwaysCopyResponseSession: false
    }
  }

  createRequest(props) {
    debug('Skill Component: createRequest')

    const request = Object.assign({}, requests[props.requestType])
    if ('intent' === props.requestType) {
      request.request.intent.name = ''
      request.request.intent.slots = {}

      if (props.intentName) {
        request.request.intent.name = props.intentName

        let slotLookUp = 'default'
        if (window.INTERACTION_MODEL) {
          slotLookUp = props.intentName
        }

        if (props.slotsByIntent.get(slotLookUp) && props.slotsByIntent.get(slotLookUp).size >= 1) {
          props.slotsByIntent.get(slotLookUp).forEach((slot) => {
            request.request.intent.slots[slot.name] = {
              name: slot.name,
              value: slot.value
            }
          })
        }
      }
    }

    return beautify(JSON.stringify(request))
  }

  setRequest(jsonString) {
    let validRequest;
    try {
      let json = JSON.parse(jsonString)
      validRequest = true
    } catch (error) {
      validRequest = false
    }

    this.setState({
      request: jsonString,
      validRequest: validRequest
    })
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      request: this.createRequest(nextProps)
    })

    if (this.state.alwaysCopyResponseSession) {
      this.copyLastAttributes();
    }
  }

  doRequest() {
    debug('Skill Component: doRequest');
    if (this.state.validRequest) {
      this.props.actions.doRequest(JSON.parse(this.state.request));
    }
  }

  copyLastAttributes() {
    const response = this.props.response;
    const request = JSON.parse(this.state.request);
    request.session.attributes = Object.assign({}, request.session.attributes, response.sessionAttributes);
    this.setState({
      request: beautify(JSON.stringify(request))
    });
  }

  render() {
    debug('Skill Component: render');

    const request = this.state.request
    const response = beautify(JSON.stringify(this.props.response))
    const requestClass = (this.state.validRequest) ? 'code' : 'invalid code'
    const { alwaysCopyResponseSession } = this.state;

    let firstIntentName = null
    let slots = []

    if (window.INTERACTION_MODEL && window.INTERACTION_MODEL.interactionModel && window.INTERACTION_MODEL.interactionModel.languageModel && window.INTERACTION_MODEL.interactionModel.languageModel.intents) {
      if (window.INTERACTION_MODEL.interactionModel.languageModel.intents[0]) {
        firstIntentName = window.INTERACTION_MODEL.interactionModel.languageModel.intents[0].name
      }

      if (this.props.intentName && this.props.slotsByIntent.get(this.props.intentName)) {
        slots = this.props.slotsByIntent.get(this.props.intentName)
      } else {
        let chosenModelIntent = null

        if (this.props.intentName) {
          for (let i = 0; i < window.INTERACTION_MODEL.interactionModel.languageModel.intents.length; i++) {
            if (this.props.intentName === window.INTERACTION_MODEL.interactionModel.languageModel.intents[i].name) {
              chosenModelIntent = window.INTERACTION_MODEL.interactionModel.languageModel.intents[i]
              break
            }
          }

          if (chosenModelIntent && chosenModelIntent.slots) {
            chosenModelIntent.slots.forEach((slot) => {
              slots.push({
                id: slot.name,
                name: slot.name,
                value: ''
              })
            })
          }
        }
      }
    } else {
      if (this.props.slotsByIntent.get('default')) {
        slots = this.props.slotsByIntent.get('default')
      }
    }

    return (
      <div className="container-fluid">
        <div className="page-header">
          <h1>Alexa Skill Test <small>{window.SKILL_NAME}</small></h1>
        </div>

        <p>Alexa Skill Test lets you easily mock requests to send to your Alexa skill locally. This page will automatically refresh when you update your skill.</p>

        <div className="form-group">
          <label htmlFor="requestType">Request Type:</label>
          <select id="requestType" className="form-control" defaultValue={this.props.requestType} onChange={(event) => this.props.actions.setRequestType(event.target.value, firstIntentName)} id="request_type">
            <option value="launch">LaunchRequest</option>
            <option value="intent">IntentRequest</option>
            <option value="session_end">SessionEndedRequest</option>
          </select>
        </div>

        {'intent' === this.props.requestType ?
          <div>
            <div className="form-group">
              <label htmlFor="intent">Intent Name:</label>
              {window.INTERACTION_MODEL && window.INTERACTION_MODEL.interactionModel && window.INTERACTION_MODEL.interactionModel.languageModel && window.INTERACTION_MODEL.interactionModel.languageModel.intents ?
                <select defaultValue={this.props.intentName} className="form-control" id="intent" onChange={(event) => this.props.actions.setIntentName(event.target.value)}>
                  {window.INTERACTION_MODEL.interactionModel.languageModel.intents.map(function(intent) {
                    return <option key={intent.name} value={intent.name}>{intent.name}</option>
                  }, this)}
                </select>
              :
                <input className="form-control" defaultValue={this.props.intentName} type="text" id="intent" onChange={(event) => this.props.actions.setIntentName(event.target.value)} />
              }
            </div>

            <div className="form-group">
              <label>Slots:</label>

              {window.INTERACTION_MODEL && window.INTERACTION_MODEL.interactionModel ?
                <div>
                  {slots.map(function(slot) {
                    return <div className="slot" key={slot.name}>
                      <input readOnly={true} className="form-control" placeholder="Name" value={slot.name} type="text" />
                      <input className="form-control" placeholder="Value" onChange={(event) => this.props.actions.setFixedSlot(event.target.value, slot.name, this.props.intentName)} value={slot.value} type="text" />
                    </div>
                  }, this)}
                </div>
              :
                <div>
                  {slots.map(function(slot, index) {
                    return <div className="slot" key={slot.id}>
                      <input className="form-control" placeholder="Name" onChange={(event) => this.props.actions.setSlotName(event.target.value, slot.id, 'default')} value={slot.name} type="text" />
                      <input className="form-control" placeholder="Value" onChange={(event) => this.props.actions.setSlotValue(event.target.value, slot.id, 'default')} value={slot.value} type="text" />

                      <a href="javascript:void(0)" className="delete-slot" onClick={(event) => this.props.actions.deleteSlot(slot.id, 'default')}>&times;</a>
                    </div>
                  }, this)}
                  <div className="form-group">
                    <a href="javascript:void(0)" onClick={() => this.props.actions.createSlot('default')}>Add a slot</a>
                  </div>
                </div>
              }
            </div>
          </div>
          :
          ''
        }
        <div>
          <input type="button" className="btn btn-primary btn-lg" value="Send Request" onClick={this.doRequest}/>
          {!this.state.alwaysCopyResponseSession && <input type="button" className="btn btn-primary btn-lg" value="Copy Response Attributes" onClick={this.copyLastAttributes} style={{marginLeft: 10}}/>}

        </div>
        <div style={{marginTop: 10}}>
          <input type="checkbox" checked={this.state.alwaysCopyResponseSession} onChange={() => this.setState({alwaysCopyResponseSession: !alwaysCopyResponseSession})}  style={{marginRight: 5}}/>
          Always Copy Response Attributes
        </div>

        <div className="row req-resp">
          <div className="col-md-6">
            <h2>Request</h2>
            <textarea className={requestClass} onChange={(event) => this.setRequest(event.target.value)} value={request}></textarea>
          </div>
          <div className="col-md-6">
            <h2>Response</h2>
            <div className="response" className="code">{response}</div>
          </div>
        </div>
      </div>
    );
  }
}

export default Skill
