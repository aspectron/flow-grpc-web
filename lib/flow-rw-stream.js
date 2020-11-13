import {FlowEvents} from './flow-events.js';
import {UID} from './helpers.js';

export class FlowRWStream {
	constructor(rpc, options){
		this.id = options.id || UID();
		this.rpc = rpc;
		this.options = options;
		const {client, method, config} = options
		this.client = client;
		this.method = method;
		this.config = config;
		this.rids = new Set();
		this.init();
	}
	init(){
		this.initEvents();
	}
	initEvents(){
		this.events = new FlowEvents();
		this.streamEndSubId = this.rpc.on("grpc.stream.end", (msg)=>{
			const {sIds} = msg;
			if(!sIds.includes(this.id))
				return
			this.events.emit("end");
			this.rpc.removePendings(this.rids);
			this.rpc.off(this.streamEndSubId);
			this.rpc.off(this.streamErrorSubId);
		})
		this.streamErrorSubId = this.rpc.on("grpc.stream.error", (msg)=>{
			const {sIds, error} = msg;
			if(!sIds.includes(this.id))
				return
			this.events.emit("error", error);
		})
	}

	on(eventName, callback){
		this.events.on(eventName, callback);
	}

	write(data){
		const {client, method} = this;
		let rid = this.rpc.streamMessage(this.id, client, method, data, (err, data)=>{
			this.rids.delete(rid)
			if(err){
				this.events.emit("error", err)
				return
			}
			this.events.emit("data", data)
		});
		this.rids.add(rid);
	}
}